# Surgeon
A tera-proxy module that is able to change your character's appearance (race, gender, appearance, etc).
Full compatibility with 64-bits client.

## Usage
Automatically loads your character(s) new look whenever you start the game.

## List of commands

### Managing presets
* `surg save` - save current character's appearance into preset;
* `surg load x` - load preset with the number `x` (0 - revert to original);
* `surg reset` - same as `surg load 0`;
* `surg delete x` - delete preset with the number `x` (if number isn't specified - current preset will be deleted, with reverting appearance to original);
* `surg swap x` - swap current preset and preset with specified number (yea manual sorting);

### Editing current preset
* `surg app` - emulate an appearance change;
* `surg gender` - emulate a gender change;
* `surg race` - emulate a race change;
* `surg skin x` - change your character's skin tone;
* `surg face x` - change your character's face type;
* `surg decal x` - change your character's face decal;
* `surg hair x` - change your character's hairstyle;
* `surg haircolor x` - change your character's hair color;
* `surg voice x` - change your character's voice;
* `surg tattoo x` - change your character's tattoos;

### Creating new preset
* `surg new app` - emulate an appearance change;
* `surg new gender` - emulate a gender change;
* `surg new race` - emulate a race change;
* `surg new skin x` - change your character's skin tone;
* `surg new face x` - change your character's face type;
* `surg new decal x` - change your character's face decal;
* `surg new hair x` - change your character's hairstyle;
* `surg new haircolor x` - change your character's hair color;
* `surg new voice x` - change your character's voice;
* `surg new tattoo x` - change your character's tattoos.

## Safety
All operation from this module are clientside, meaning **only you** can see the effects.
Note that race change **will** desync you when using skills unless racial skill movement between old and new races is extremely similar (ie. sorc, gunner). (c) Pinkie Pie

## TODO
* Make code less bad (c)
