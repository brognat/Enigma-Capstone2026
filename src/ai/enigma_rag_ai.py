import os
import chromadb
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import getpass
import traceback
from openai import OpenAI

load_dotenv()  # Load environment variables from .env file


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_DIR = os.path.join(BASE_DIR, "documents_enigma")
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_storage")

FALLBACK_LINE = "I can't answer that. Try asking something related to the Enigma escape room."

MODEL_NAME = "openai/gpt-oss-20b"
HISTORY_MESSAGES = 6          # last 3 exchanges = 6 messages
VALID_MODES = ("socratic", "full", "none")

def load_text_files(folder_path):
    # Read all .txt files from a folder and return their contents.
    documents = []
    for filename in os.listdir(folder_path):
        if filename.lower().endswith(".txt"):
            filepath = os.path.join(folder_path, filename) 
            with open(filepath, "r", encoding="utf-8") as f: # Use utf-8 encoding to read the file
                documents.append({
                    "filename": filename,
                    "text": f.read()
                })
    return documents

def chunk_text(text, chunk_size=500, overlap=50): #500 tokens per chunk with 50 token overlap
    # Split the text into chunks of specified size with overlap.
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


model = SentenceTransformer('all-MiniLM-L6-v2')


def process_documents(folder_path): # Process all text documents in a folder, chunk them, and generate embeddings.
    docs = load_text_files(folder_path)
    all_chunks = []
    metadata = []

    for doc in docs:
        chunks = chunk_text(doc["text"])
        for i, chunk in enumerate(chunks):
            all_chunks.append(chunk)
            metadata.append({"source": doc["filename"], "chunk_index": i})

    embeddings = model.encode(all_chunks) # Generate embeddings for all chunks using the SentenceTransformer model
    return all_chunks, embeddings, metadata

def store_in_chromadb(all_chunks, embeddings, metadata, persist_path="chroma_storage"):
    # Create a persistent client — this saves the DB to disk in persist_path
    chroma_client = chromadb.PersistentClient(path=persist_path)

    # Fresh collection each run so rerunning with new files doesn't mix stale data with new data
    try:
        chroma_client.delete_collection("project4_docs")
    except Exception:
        pass
    collection = chroma_client.create_collection("project4_docs")

    # ChromaDB needs a unique string ID per entry
    ids = [f"{meta['source']}_chunk{meta['chunk_index']}" for meta in metadata]

    collection.add(
        ids=ids,
        embeddings=embeddings.tolist(),  # numpy array conversion to plain list
        documents=all_chunks,
        metadatas=metadata,
    )

    return collection


def retrieve_chunks(collection, query, top_k=3):
    # Embed the query using the same model used for the documents
    query_embedding = model.encode([query]).tolist()

    # Ask ChromaDB for the top_k most similar chunks
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
    )

    # results["documents"][0] is the list of matched chunk texts
    # results["metadatas"][0] is the matching metadata for each
    retrieved = []
    for text, meta in zip(results["documents"][0], results["metadatas"][0]):
        retrieved.append({
            "text": text,
            "source": meta["source"],
            "chunk_index": meta["chunk_index"],
        })
    return retrieved

HISTORY_RULE = (
    "Use the recent conversation to understand references in the player's latest message "
    "(for example, 'it' or 'that number'). Use the active room's retrieved context for "
    "room facts. If the latest message and conversation still don't provide enough detail, "
    "ask one concise clarifying question instead of guessing."
)

VAGUE_RULE = (
    "SPECIAL CASE, vague or stuck: if the player says something is not working, "
    "or that they are stuck or don't know what to do, without saying what they tried, "
    "do not guess the cause and do not use the line above. "
    "Ask ONE short question about what they changed last or what a readout in the room "
    "is showing.\n"
    "Example:\n"
    "Player: it's not working\n"
    "You: What did you change last, and what did the analyzer show afterward?"
)

FULL_RULES = [
    (
        "You are a helper inside the Enigma escape room. "
        "Use ONLY the provided context for facts about the room. "
        "If the answer is not in the context, reply exactly: "
        f"\"{FALLBACK_LINE}\""
    ),
    VAGUE_RULE,
    HISTORY_RULE,
]

SOCRATIC_RULES = [
    (
        "You are a teacher's helper inside the Enigma escape room. "
        "Use ONLY the provided context for facts about the room. "
        "Never give the answer directly. Instead, ask questions that guide the player "
        "to think critically and discover the answer themselves. "
        "If the answer is not in the context, reply exactly: "
        f"\"{FALLBACK_LINE}\""
    ),
    (
        "SPECIAL CASE, player says to just give the answer: if the player says to just "
        "give the answer, do not give the answer. Instead, respond with a hint or a "
        "question that encourages them to think and try again.\n"
        "Example:\n"
        "Player: Just give me the answer\n"
        "You: I can't do that. Try asking a question about the clues in the room "
        "or what you've tried so far."
    ),
    VAGUE_RULE,
    (
        "SPECIAL CASE, player asks for a hint: do not state any settings or values. "
        "Give a subtle nudge as ONE guiding question about a control or readout in the room.\n"
        "Example:\n"
        "Player: I need a hint\n"
        "You: What does the readout show after your last attempt, and how is it "
        "different from what you want?"
    ),
    HISTORY_RULE,
]

def get_system_rules(mode):
    if mode == "socratic":
        return "\n\n".join(SOCRATIC_RULES)
    if mode == "full":
        return "\n\n".join(FULL_RULES)
    raise ValueError(f"Unknown mode: {mode!r}")


def build_prompt(question, retrieved_chunks):
    # Merge the retrieved chunks into one context block
    context = "\n\n".join(chunk["text"] for chunk in retrieved_chunks)

    return f"""Context:
{context}

Question: {question}

Answer:"""


def generate_answer(client, question, retrieved_chunks, rules, history):
    prompt = build_prompt(question, retrieved_chunks)

    response = client.chat.completions.create(
        model= MODEL_NAME,
        messages=[
            {"role": "system", "content": rules},
            *history[-HISTORY_MESSAGES:],  # Include the last 3 answers and questions for context (6 messages total)
            {"role": "user", "content": prompt},
        ],
        max_tokens=1000,
        temperature=0.2,
    )

    text = response.choices[0].message.content
    text = text or "Sorry, I couldn't come up with a response. Please try again."

    history.extend([   
        {"role": "user", "content": question},
        {"role": "assistant", "content": text},
    ])
    del history[0:-HISTORY_MESSAGES]  # Keep only the last 6 messages in history

    return text

SESSIONS = {}  # Dictionary to hold session data

def start_session(session_id, mode):
    if mode not in VALID_MODES:
        raise ValueError(f"Unknown mode: {mode!r}")

    SESSIONS[session_id] = {
        "mode": mode,
        "rules": get_system_rules(mode) if mode != "none" else None,
        "history": [],
    }


def handle_message(client, collection, session_id, message):
    #only session id and text come through from the website
    sessions = SESSIONS.get(session_id)
    if not sessions:
        raise ValueError(f"Unknown session {session_id!r}. Start it first.")
    
    if sessions["mode"] == "none":
        return "No mode selected. Please start a session with a valid mode."
    
    history = sessions["history"]

    # Search with the previous question too, so follow-ups like "why not?" still retrieve well  
    last_question = history[-2]["content"] if len(history) >= 2 else ""
    search_text = f"{last_question} {message}".strip()

    chunks = retrieve_chunks(collection, search_text)
    answer = generate_answer(client, message, chunks, sessions["rules"], history)

    return answer




if __name__ == "__main__":

    TEST_MODE = "socratic"  # Change to "full" for direct answers, or "none" for no mode

    groq_key = os.environ.get("api_key")


    client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=groq_key,
    )

    # 2. Build the knowledge base
    os.makedirs(DOCS_DIR, exist_ok=True) # Ensure the documents folder exists
    all_chunks, embeddings, metadata = process_documents(DOCS_DIR)

    if not all_chunks:
        print("No text found. Add .txt files to the documents_enigma folder and re-run.")
        exit()

    collection = store_in_chromadb(all_chunks, embeddings, metadata)
    print(f"Stored {collection.count()} chunks in ChromaDB.")

    start_session("local-test", TEST_MODE)
    print(f"Session started in {TEST_MODE} mode.\n")

    # 3. Ask for the question
    while True:
        query = input("Question: ").strip()
        if not query:
            break
        try:
            answer = handle_message(client, collection, "local-test", query)
            print(f"\nAnswer: {answer}")
        except Exception as e:
            traceback.print_exc()
            print(f"Error calling the Groq API: {e}")
            if getattr(e, "response", None) is not None:
                print(e.response.text)  # type: ignore
            continue
    


    