## Surgeon
A tera-proxy module that is able to change your character's appearance (race, gender, face slider and voice).

### Usage
Automatically loads your character(s) new look whenever you start the game.

While in game, open a proxy chat session by typing `/proxy` or `/8` in chat and hitting the space bar.
This serves as the script's command interface.
List of commands:

* `surgeon` - shows all commands listed below.
* `surgeon load [x]` - preview/load the preset with the number **x**.
* `surgeon app` - emulates an appearance change; edits current preset, or creates new one if used with your "true" appearance.
* `surgeon gender` - emulates a gender change.
* `surgeon race` - emulates a race change.
* `surgeon new app` - emulates an appearance change; creates new preset.
* `surgeon new gender` - emulates a gender change; creates new preset.
* `surgeon new race` - emulates a race change; creates new preset.
* `surgeon save` - saves current character's appearance into preset.

### Safety
All operation from this module are clientside, meaning **only you** can see the effects.
Note that race change **will** desync you when using skills unless racial skill movement between old and new races is extremely similar (ie. sorc, gunner). (c) Pinkie Pie

### TODO
* Make code less bad (c)
* Fix a bug with `surgeon load [x]` when used with original appearance (i have no idea what causes it)
* Add feature to remove presets