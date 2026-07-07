#!/usr/bin/env bash
# Linux desktop shortcut builder for Brave Extensions page

DESKTOP_DIR="$HOME/Desktop"
if [ ! -d "$DESKTOP_DIR" ]; then
    DESKTOP_DIR="$HOME"
fi

cat << 'EOF' > "$DESKTOP_DIR/Brave_Extensions.desktop"
[Desktop Entry]
Version=1.0
Name=Brave Extensions
Comment=Open Brave Extensions directly
Exec=brave-browser --new-window brave://extensions/
Icon=brave-browser
Terminal=false
Type=Application
Categories=Network;WebBrowser;
EOF

chmod +x "$DESKTOP_DIR/Brave_Extensions.desktop"
echo "Brave Extensions desktop entry created at $DESKTOP_DIR/Brave_Extensions.desktop"
