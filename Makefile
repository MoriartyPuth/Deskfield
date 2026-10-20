UUID = deskfield@MoriartyPuth.github.io
ZIP  = $(UUID).shell-extension.zip

.PHONY: all pack install clean

all: pack

schemas/gschemas.compiled: schemas/org.gnome.shell.extensions.deskfield.gschema.xml
	glib-compile-schemas schemas

pack: schemas/gschemas.compiled
	gnome-extensions pack --force \
		--extra-source=lib \
		--extra-source=stylesheet.css \
		--extra-source=LICENSE \
		--out-dir=.
	@echo "Built $(ZIP)"

install: pack
	gnome-extensions install --force $(ZIP)
	@echo "Installed. Log out and back in, then enable Deskfield."

clean:
	rm -f schemas/gschemas.compiled $(ZIP)
