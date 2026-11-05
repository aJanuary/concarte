import { Config } from "../../app/config.types";

const config: Config = {
  eventName: "DemoCon",
  locale: "en",
  description: `
    An interactive map of the DemoCon venue.

    This is an example of how you can use ConCarte to create an interactive
    map of your event. This map is for a fictional event called DemoCon, and
    includes various rooms and areas that you might find at a convention.

    In the real world, this would be a brief description of your event, and
    would include a link to your website.
  `,
  attributions: [
    // Used in the favicon
    "Direction signs icon by [Delapouite](https://delapouite.com/) under [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/)",
  ],
  theme: {
    background: "#eeece6",
    "control-background": "white",
    "highlight-background": "#e3e0d8",
    border: "#d6d2c8",
    "primary-text": "rgb(43, 43, 43)",
    "secondary-text": "rgb(100 116 139)",
    accent: "rgb(8,114,50)",
    disabled: "#cbd5e1",
  },
  filters: ["Toilets", "Food"],
  maps: [
    {
      id: "ground",
      label: "Ground floor",
      src: "/ground.svg",
      overlays: [
        {
          id: "step-free",
          label: "♿ Step-free routes",
          src: "/step-free-ground.svg",
        },
      ],
      rooms: [
        {
          id: "main-hall",
          label: "Main Hall",
          aliases: ["Programme", "Opening ceremony", "Main stage"],
          description: `
          The largest programme room, seating about 600 theatre-style.

          # Highlights
          **Friday**: Opening ceremony, 7pm \\
          **Saturday**: Guest of honour interview, 2pm \\
          **Sunday**: Closing ceremony, 4pm

          Overflow viewing is available from the [Main Hall Gallery](/map/first/room/gallery) on the first floor.

          ♿ Wheelchair spaces are at the front and rear of the room.
          `,
          area: { ref: "main-hall" },
        },
        {
          id: "green-room",
          label: "Green Room",
          aliases: ["Speakers", "Panellists"],
          description: `
          If you are on a programme item, please check in here 15 minutes before it starts.

          Free tea, coffee and snacks are available for programme participants.
          `,
          area: { ref: "green-room" },
        },
        {
          id: "workshop-1",
          label: "Workshop Room 1",
          aliases: ["Programme", "Workshops"],
          description: `
          Hands-on sessions, such as costume repair and miniature painting.

          Capacity 40, with tables.
          `,
          area: { ref: "workshop-1" },
        },
        {
          id: "workshop-2",
          label: "Workshop Room 2",
          aliases: ["Programme", "Workshops"],
          description: `
          Hands-on sessions. Capacity 40, with tables.
          `,
          area: { ref: "workshop-2" },
        },
        {
          id: "workshop-3",
          label: "Workshop Room 3",
          aliases: ["Programme", "Workshops"],
          description: `
          Hands-on sessions. Capacity 50, with tables.
          `,
          area: { ref: "workshop-3" },
        },
        {
          id: "dealers",
          label: "Dealers' Room",
          aliases: ["Shopping", "Vendors", "Fan tables"],
          description: `
          Books, games, jewellery and other merchandise from independent sellers.

          🕗 Friday 3pm - 7pm \\
          🕗 Saturday 10am - 6pm \\
          🕗 Sunday 10am - 4pm
          `,
          area: { ref: "dealers" },
        },
        {
          id: "stairs-ground",
          label: "Stairs",
          aliases: ["Stairs"],
          description: `
          Stairs up to the first floor.

          ♿ Not step-free. Use the [lifts](/map/ground/room/lifts) instead.
          `,
          area: { ref: "stairs-ground" },
        },
        {
          id: "toilets-ground",
          label: "Toilets",
          aliases: ["Toilets", "WC"],
          description: `
          Toilets with cubicles and urinals.

          The convention's policy is that people are welcome to use whichever toilets they feel most comfortable in.
          `,
          area: { ref: "toilets-ground" },
        },
        {
          id: "accessible-toilet-ground",
          label: "Accessible Toilet",
          aliases: ["Toilets", "♿ Access note"],
          description: `
          Wide cubicle with support rails.

          ♿ The door opens outwards and is step-free.
          `,
          area: { ref: "accessible-toilet-ground" },
        },
        {
          id: "lifts",
          label: "Lifts",
          aliases: ["Lift", "Elevator"],
          description: `
          Two lifts serving both floors.

          ♿ Both lifts are wheelchair accessible.
          `,
          area: { ref: "lifts" },
        },
        {
          id: "info-desk",
          label: "Information Desk",
          aliases: ["Help", "Lost and found", "First aid"],
          description: `
          Questions, lost property and first aid.

          🕗 Friday 9am - 10pm \\
          🕗 Saturday 9am - 10pm \\
          🕗 Sunday 9am - 6pm
          `,
          area: { ref: "info-desk" },
        },
        {
          id: "cloakroom",
          label: "Cloakroom",
          aliases: ["Coats", "Luggage"],
          description: `
          Free, staffed coat and bag storage.
          `,
          area: { ref: "cloakroom" },
        },
        {
          id: "lobby",
          label: "Lobby",
          aliases: ["Seating", "Entrance"],
          description: `
          Seating and charging points. The [Registration Desk](/map/ground/room/registration) is just inside the main entrance.
          `,
          area: { ref: "lobby" },
        },
        {
          id: "registration",
          label: "Registration Desk",
          aliases: ["Registration", "Badges"],
          description: `
          Pick up your badge and programme book.

          If the desk is closed, ask at the [Information Desk](/map/ground/room/info-desk).

          🕗 Thursday 4pm - 8pm \\
          🕗 Friday 8am - 6pm \\
          🕗 Saturday 8am - 12pm
          `,
          area: { ref: "registration" },
        },
        {
          id: "main-entrance",
          label: "Main Entrance",
          aliases: ["Entrance", "Car park"],
          description: `
          Automatic doors, step-free from the pavement.
          `,
          area: { ref: "main-entrance" },
        },
        {
          id: "cafe",
          label: "Caf\u00e9",
          aliases: ["Food", "Drinks", "Seating"],
          description: `
          Hot and cold food, with vegan and gluten-free options.

          🕗 Open 7am - 9pm

          ♿ The doorway from the lobby has three steps. The step-free entrance is from the east corridor.

          Clicking this room on the map opens the menu in a new tab.
          `,
          link: { href: "https://example.com/menu", title: "View the menu" },
          area: { ref: "cafe" },
        },
        {
          id: "terrace",
          label: "Terrace",
          aliases: ["Food", "Seating", "Outdoors"],
          description: `
          Outdoor seating for the [Café](/map/ground/room/cafe), weather permitting.
          `,
          area: { ref: "terrace" },
        },
      ],
    },
    {
      id: "first",
      label: "First floor",
      src: "/first.svg",
      overlays: [
        {
          id: "step-free",
          label: "♿ Step-free routes",
          src: "/step-free-first.svg",
        },
      ],
      rooms: [
        {
          id: "gallery",
          label: "Main Hall Gallery",
          aliases: ["Programme", "Overflow"],
          description: `
          Standing and seated viewing over the [Main Hall](/map/ground/room/main-hall), with a live feed of the stage.

          ♿ Reached by lift only.
          `,
          area: { ref: "gallery" },
        },
        {
          id: "sky-bar",
          label: "Sky Bar",
          aliases: ["Food", "Bar", "Drinks", "Social"],
          description: `
          Cocktails and views over the city.

          Open to everyone aged 18+ with a badge.

          🕗 Friday - Saturday 5pm - 1am \\
          🕗 Sunday 5pm - 11pm
          `,
          area: { ref: "sky-bar" },
        },
        {
          id: "panel-a",
          label: "Panel Room A",
          aliases: ["Programme", "Panels"],
          description: `
          Panels and talks. Capacity 80, theatre-style.
          `,
          area: { ref: "panel-a" },
        },
        {
          id: "panel-b",
          label: "Panel Room B",
          aliases: ["Programme", "Panels"],
          description: `
          Panels and talks. Capacity 80, theatre-style.
          `,
          area: { ref: "panel-b" },
        },
        {
          id: "panel-c",
          label: "Panel Room C",
          aliases: ["Programme", "Panels"],
          description: `
          Panels and talks. Capacity 100, theatre-style.
          `,
          area: { ref: "panel-c" },
        },
        {
          id: "games-room",
          label: "Games Room",
          aliases: ["Games", "Social", "Tabletop"],
          description: `
          Board games, card games and roleplaying. A library of games is available, or bring your own.

          🕗 Open 10am - midnight
          `,
          area: { ref: "games-room" },
        },
        {
          id: "stairs-first",
          label: "Stairs",
          aliases: ["Stairs"],
          description: `
          Stairs down to the ground floor.
          `,
          area: { ref: "stairs-first" },
        },
        {
          id: "toilets-first",
          label: "Toilets",
          aliases: ["Toilets", "WC"],
          description: `
          Toilets with cubicles and urinals.
          `,
          area: { ref: "toilets-first" },
        },
        {
          id: "accessible-toilet-first",
          label: "Accessible Toilet",
          aliases: ["Toilets", "♿ Access note"],
          description: `
          Wide cubicle with support rails.
          `,
          area: { ref: "accessible-toilet-first" },
        },
        {
          id: "lifts-first",
          label: "Lifts",
          aliases: ["Lift", "Elevator"],
          description: `
          Two lifts serving both floors.

          ♿ Both lifts are wheelchair accessible.
          `,
          area: { ref: "lifts-first" },
        },
        {
          id: "quiet-room",
          label: "Quiet Room",
          aliases: ["Quiet", "Seating"],
          description: `
          A calm space away from noise and crowds. Please keep conversation to a whisper.
          `,
          area: { ref: "quiet-room" },
        },
        {
          id: "mezzanine-lounge",
          label: "Mezzanine Lounge",
          aliases: ["Seating", "Social"],
          description: `
          Comfortable seating overlooking the [Lobby](/map/ground/room/lobby).
          `,
          area: { ref: "mezzanine-lounge" },
        },
        {
          id: "atrium",
          label: "Atrium",
          description: `
          An open void looking down on the lobby, behind a glass railing.

          Not searchable, because there is nothing to find here.
          `,
          searchable: false,
          area: { ref: "atrium" },
        },
        {
          id: "art-show",
          label: "Art Show",
          aliases: ["Exhibits", "Gallery"],
          description: `
          Paintings, prints and sculpture from our members, with a silent auction.

          🕗 Friday 4pm - 8pm \\
          🕗 Saturday 10am - 6pm \\
          🕗 Sunday 10am - 3pm (collection of purchased works)
          `,
          area: { ref: "art-show" },
        },
        {
          id: "ops",
          label: "Operations",
          aliases: ["Volunteer", "Help"],
          description: `
          The convention's control room. Come here to volunteer, or to report a problem.
          `,
          area: { ref: "ops" },
        },
      ],
    },
  ],
};

export default config;
