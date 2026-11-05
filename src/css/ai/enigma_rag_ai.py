import os
import chromadb
from sentence_transformers import SentenceTransformer
import getpass
import traceback
from openai import OpenAI


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

GUARDRAIL = (# This is a guardrail for the LLM to ensure it only uses the provided context to answer questions.
    "Answer the question using ONLY the provided context. "
    "If the answer is not in the context, say 'I can't answer that. Try asking something related to the Enigma escape room."
)

def build_prompt(question, retrieved_chunks):
    # Merge the retrieved chunks into one context block
    context = "\n\n".join(chunk["text"] for chunk in retrieved_chunks)

    return f"""Context:
{context}

Question: {question}

Answer:"""


def generate_answer(client, question, retrieved_chunks):
    prompt = build_prompt(question, retrieved_chunks)

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {"role": "system", "content": GUARDRAIL},
            {"role": "user", "content": prompt},
        ],
        max_tokens=1000,
    )
    text = response.choices[0].message.content
    return text or "Sorry, I couldn't come up with a response. Please try again."



if __name__ == "__main__":
    # 1. Ask for the key (hidden as they type)
    groq_token = getpass.getpass("Enter your Groq API key: ").strip()#keep key confidential by using getpass to hide input
    if not groq_token:
        print("No key entered. Exiting.")
        exit()

    client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=groq_token,
    )

    # 2. Build the knowledge base
    os.makedirs("documents_enigma", exist_ok=True) # Ensure the documents folder exists
    all_chunks, embeddings, metadata = process_documents("documents_enigma")

    if not all_chunks:
        print("No text found. Add .txt files to the documents_enigma folder and re-run.")
        exit()

    collection = store_in_chromadb(all_chunks, embeddings, metadata)
    print(f"Stored {collection.count()} chunks in ChromaDB.")

    # 3. Ask for the question
    query = input("What question would you like answered? ").strip()
    if not query:
        print("No question entered. Exiting.")
        exit()

    # 4. Retrieve, generate, display
    retrieved_chunks = retrieve_chunks(collection, query)
    try:
        answer = generate_answer(client, query, retrieved_chunks)
    except Exception as e:
        traceback.print_exc()
        print(f"Error calling the Groq API: {e}")
        if getattr(e, "response", None) is not None:
            print(e.response.text) # type: ignore
        exit()
    

    print(f"\nAnswer: {answer}")

