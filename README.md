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

Select **Export data** at the bottom left of the home page to download the
saved click log as `transcripttest.txt`. The log includes clicks accumulated
in this browser's localStorage, not player IDs or ages. Exporting does not
clear the saved log.

The placeholder game has a **Finish room** link to `Complete.html`, which
offers a manual **Export data** button and a **Return home** link. When room
completion logic is implemented, navigate to `Complete.html` on success.
No download starts automatically on completion.
