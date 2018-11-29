## Surgeon
A tera-proxy module that is able to change your character's appearance (race, gender, face slider).

### Usage
Automatically loads your character(s) new look whenever you start the game.

While in game, open a proxy chat session by typing `/proxy` or `/8` in chat and hitting the space bar.
This serves as the script's command interface.
List of commands:

* `surg` - shows all commands listed below;
* `surg save` - save current character's appearance into preset;
* `surg load x` - load preset with specified number (0 - revert to original);
* `surg reset` - same as `surg load 0`;
* `surg delete x` - delete preset with specified number (if number not specified - current preset will be deleted);
* `surg swap x` - swap current preset and preset with specified number (yea manual sorting);
* `surg app|gender|race` - emulate an appearance/gender/race change for current preset (create new one if used with your original appearance);
* `surg new app|gender|race` - emulate an appearance/gender/race change, create new preset.

### Safety
All operation from this module are clientside, meaning **only you** can see the effects.
Note that race change **will** desync you when using skills unless racial skill movement between old and new races is extremely similar (ie. sorc, gunner). (c) Pinkie Pie

### TODO
* Make code less bad (c)
* Fix a bug with `surgeon load [x]` when used with original appearance (i have no idea what causes it, atleast it correctly loads new appearance, but resets any costume mods clothing)