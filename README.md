# CSCapstone

CS Capstone: AI Escape Room - Wander, Erik, Todd

On the game page, clicking the robot for the selected AI mode opens its chat
panel and focuses a message box. Both Full AI and Collaborative A.I. support
typing a draft; closing and reopening the panel preserves it until the page is
reloaded. The Send button is disabled for this visual preview: messages are not
sent, saved, or answered. Close the panel with its close button, the robot, or
Escape. No robot is shown in No A.I. mode.

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

### Stone hallway prototype

Open `Game2.html` to play the separate 3D stone hallway prototype. Move the red
player with WASD and the blue player with the arrow keys. Approach the left metal
terminal and press **Q** as red, or approach the right terminal and press **M**
as blue. Each terminal has a black square screen and blocks movement. Interaction
only displays a confirmation message for now; it does not open a puzzle or
complete the room. Movement and interaction keys are ignored while typing in chat.