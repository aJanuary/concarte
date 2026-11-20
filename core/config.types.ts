export type Config = {
  /**
   * Name of the event. Displayed in titles and about pages.
   */
  eventName: string;

  /**
   * Locale the content is in. Should be a 2-letter ISO 639-1 code.
   */
  locale: string;

  /**
   * Path the site is served under, for hosting it somewhere other than the
   * root of a domain, such as `/myevent` for `https://example.com/myevent/`.
   * Starts with `/` and has no trailing `/`. Leave out to serve from the root.
   *
   * Links in markdown that start with `/` are relative to this path, so
   * `/about` goes to `/myevent/about`.
   */
  basePath?: string;

  /**
   * Description of the event. Displayed in the about page.
   *
   * Supports markdown.
   */
  description: string;

  /**
   * Attributions for any graphics or other resources that need attribution.
   *
   * Supports markdown.
   */
  attributions?: string[];

  /**
   * The colors to use for the theme, each as a hex code such as `#1a2b3c`, or
   * with an alpha channel for opacity such as `#1a2b3c80`.
   */
  theme: {
    /**
     * Background of the whole page. Should match the background of the map.
     */
    background: string;

    /**
     * Background of controls and panels that sit on top of the map, such as
     * the search box, filter pills, and the info panel.
     */
    "control-background": string;

    /**
     * Background of the rooms in the room list when hovered.
     */
    "highlight-background": string;

    /**
     * Border of the search box, and the lines in-between items in the room list.
     */
    border: string;

    /**
     * Text color for the majority of the text.
     */
    "primary-text": string;

    /**
     * Text color for secondary text, such as aliases.
     */
    "secondary-text": string;

    /**
     * Accent color used for links, active filters, and the outline of selected
     * rooms.
     */
    accent: string;

    /**
     * Fill of selected rooms and rooms matching a search or filter. Usually
     * translucent, so the map shows through.
     */
    "highlighted-room-background": string;

    /**
     * Disabled button color.
     */
    disabled: string;
  };

  /**
   * Quick-filter pills shown below the search box.
   * Each value is matched against room labels and aliases.
   */
  filters?: string[];

  /**
   * Id of the map shown when no map is chosen, such as on the home page.
   * Defaults to the first map in the list.
   */
  defaultMap?: string;

  /**
   * Maps to use for the event.
   * If there is more than one map, a floor selector will be shown, in the
   * order the maps are listed here.
   */
  maps: Map[];
};

export interface Overlay {
  /**
   * Identifier for the overlay. Whether an overlay is switched on is
   * remembered by id, so maps that give an overlay the same id share its
   * on/off state.
   */
  id: string;
  /** Label shown on the toggle pill. */
  label: string;
  /**
   * Path of the overlay's SVG. Its viewBox must match that of the map it is
   * listed under.
   */
  src: string;
}

export type Map = {
  /**
   * Unique identifier for the map. Appears in the URL.
   */
  id: string;

  /**
   * Label for the map. Appears in the floor selector if there are multiple maps.
   */
  label: string;

  /**
   * Path of the map's SVG. Its viewBox sets the map's co-ordinate space, and
   * rooms' shapes are looked up in it.
   */
  src: string;

  /**
   * Overlay images that can be toggled on/off over this map.
   */
  overlays?: Overlay[];

  /**
   * List of rooms on the map.
   */
  rooms: Room[];
};

export type Room = {
  /**
   * Unique identifier for the room. Appears in the URL.
   */
  id: string;

  /**
   * Label for the room. Appears in the room list and in the info panel.
   */
  label: string;

  /**
   * Aliases for the room. Appears in the room list and in the info panel.
   *
   * The search box will match these aliases.
   */
  aliases?: string[];

  /**
   * Description of the room. Appears in the info panel.
   *
   * Supports markdown.
   */
  description?: string;

  /**
   * Optional link to display at the bottom of the room description.
   * If present, a link will be added to the bottom of the description panel.
   * Clicking on the room on the map will open this link in a new tab.
   */
  link?: {
    href: string;
    title: string;
  };

  /**
   * Whether this room should appear in the search list.
   * Defaults to true if not specified.
   */
  searchable?: boolean;

  /**
   * The `id` of the element in the map's SVG that outlines the room.
   *
   * Supports `<path>`, `<rect>`, `<circle>`, `<ellipse>`, `<polygon>`,
   * `<polyline>`, and `<g>` elements (each of a group's descendants becomes
   * part of the room). The element's own transform and its ancestors'
   * transforms are applied.
   */
  shape: string;
};
