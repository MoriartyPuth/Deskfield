# Deskfield

An always-visible search field that lives on your GNOME desktop. Type an
application name and press <kbd>Enter</kbd> to launch it — `fire` → Firefox,
`term` → Terminal, and so on. A configurable keyboard shortcut focuses the
field from anywhere.

The field sits on the wallpaper layer, so open windows cover it like any other
desktop widget.

## Features

- Desktop-level search field, always present on the wallpaper.
- Fuzzy application matching that prefers the shortest matching name.
- Configurable position, width, and search icon.
- Configurable focus shortcut (default <kbd>Super</kbd>+<kbd>/</kbd>).

## Requirements

- GNOME Shell 50 (Wayland or X11).

## Install from source

```sh
make install
```

Then log out and back in, and enable **Deskfield** in the Extensions app.

## Build a zip

```sh
make pack
```

This produces `deskfield@MoriartyPuth.github.io.shell-extension.zip`.

## Settings

Open the extension's preferences (Extensions app → Deskfield → Settings):

- **Position** — horizontal and vertical placement, as a percentage of the
  primary monitor.
- **Width** — field width in pixels.
- **Show search icon** — toggle the magnifier icon.
- **Shortcut** — the key combination that focuses the field.

## License

Deskfield is released under the GNU General Public License v2.0 or later. See
[`LICENSE`](LICENSE).
