# CSCapstone
CS Capstone: AI Escape Room - Wander, Erik, Todd

Open `Index.html` in a browser and select **Start** to open player setup.
Enter a user ID and a positive whole-number age for each of the two players,
then choose Full AI implementation, Collaborative A.I., or No A.I. implementation.
**Confirm setup** validates the fields and opens `Game.html`, a blank game page
with the placeholder "game goes on here". **Cancel** or Escape closes the menu
without navigating.

This is a setup interface, not account authentication or a playable game.
Player details and the AI selection are not saved or passed to the placeholder
page. They are not sent to a server. The existing click logger is unchanged and
is also included on the game page.

Use **Export click transcript (CSV)** on the setup or game page to download
`clicks.csv` from the click logger's current log, including clicks restored from
local storage. Each click is a row with `time`, `button`, `x`, `y`, `target`,
and `text` columns. Exporting does not clear the log. This is a click-event
transcript, not an AI chat transcript.
