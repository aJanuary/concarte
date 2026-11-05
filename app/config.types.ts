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
   * Description of the event. Displayed in the about page.
   *
   * Supports markdown.
   *
   * Will be trimmed and dedented before being displayed.
   */
  description: string;

  /**
   * Attributions for any graphics or other resources that need attribution.
   *
   * Supports markdown.
   */
  attributions?: string[];

  /**
   * The colors to use for the theme.
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
     * Accent color used for links and room borders.
     */
    accent: string;

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
   * Path to the image (raster or SVG). Must match the coordinate space of the
   * map it is listed under.
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
   * Path of the map image.
   * Should be as high resolution as possible.
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
   *
   * Will be trimmed and dedented before being displayed.
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
   * Area of the room on the map.
   *
   * Can be either:
   * - A list of points in the form [x, y]
   * - An SVG path string (e.g., "M 0 0 L 100 100 L 100 0 Z")
   * - A reference to an object in the map's SVG, by its `id` attribute.
   *   Resolved at build time (see scripts/generate-config.ts) into a plain
   *   path string, with the referenced object's own transform and all of
   *   its ancestors' transforms baked in. Supports `<path>`, `<rect>`,
   *   `<circle>`, `<ellipse>`, `<polygon>`, `<polyline>`, and `<g>` elements
   *   (a group's descendants each become a sub-path of the area).
   *
   * In the image co-ordinates; the origin is the top left corner of the image.
   */
  area: [number, number][] | string | { ref: string };
};
