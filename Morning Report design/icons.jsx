/* Shared inline-SVG icons for the Morning Report directions.
   Every icon takes {size, color, stroke} and inherits currentColor by default. */
(function () {
  const I = (paths, vb = 24) => ({ size = 18, color = 'currentColor', stroke = 1.8, fill = 'none', style }) =>
    React.createElement('svg', {
      width: size, height: size, viewBox: `0 0 ${vb} ${vb}`, fill, stroke: color,
      strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', style,
    }, paths.map((d, i) => React.createElement('path', { key: i, d })));

  const Icons = {
    Search:    I(['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M21 21l-4.3-4.3']),
    Calendar:  I(['M8 2v4', 'M16 2v4', 'M3 9h18', 'M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z']),
    Bookmark:  I(['M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z']),
    Trending:  I(['M3 17l6-6 4 4 7-7', 'M17 8h4v4']),
    Arrow:     I(['M5 12h14', 'M13 5l7 7-7 7']),
    ArrowUp:   I(['M12 19V5', 'M6 11l6-6 6 6']),
    ArrowDown: I(['M12 5v14', 'M6 13l6 6 6-6']),
    Chevron:   I(['M9 6l6 6-6 6']),
    ChevronD:  I(['M6 9l6 6 6-6']),
    Bell:      I(['M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.7 21a2 2 0 0 1-3.4 0']),
    Globe:     I(['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M3 12h18', 'M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z']),
    Grid:      I(['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z']),
    Layers:    I(['M12 2 2 7l10 5 10-5-10-5Z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5']),
    Dot:       I(['M12 12h.01'], 24),
    Pulse:     I(['M3 12h4l2-7 4 14 2-7h6']),
    Plus:      I(['M12 5v14', 'M5 12h14']),
    Clock:     I(['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2']),
    Filter:    I(['M3 5h18', 'M6 12h12', 'M10 19h4']),
    Spark:     I(['M13 2 4 14h7l-1 8 9-12h-7l1-8Z']),
    Heart:     I(['M12 20.3 4.2 12.5a4.5 4.5 0 0 1 6.4-6.4l1.4 1.4 1.4-1.4a4.5 4.5 0 0 1 6.4 6.4Z']),
    Sources:   I(['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z']),
    External:  I(['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6']),
  };

  window.Icons = Icons;
})();
