const config = {
  theme: {
    // Background of the whole page. Should match the background of the map.
    background: "white",

    // Background of the rooms in the room list when hovered.
    "highlight-background": "rgb(241 245 249)",

    // Border of the search box, and the lines in-between items in the room list.
    border: "rgb(226 232 240)",

    // Text color for the majority of the text.
    "primary-text": "rgb(43, 43, 43)",

    // Text color for secondary text, such as aliases.
    "secondary-text": "rgb(100 116 139)",

    // Accent color used for links and room borders.
    accent: "rgb(8,114,50)",

    // Disabled button color.
    disabled: "#cbd5e1",
  },
  map: {
    // Path of the map image.
    // Should be as high resolution as possible.
    src: "/map.png",

    // List of rooms to display on the map, and allow searching for.
    // Rooms are of the form:
    /*
      {
        // Unique identifier of the room. Appears in the URL.
        id: "a-room",
    
        // Label for the room. Appears in the room list and in the info panel.
        label: "A room",
    
        // Aliases for the room. Appears in the room list and in the info
        // panel.
        // The search box will match these aliases.
        aliases: ["Another name for the room"],
    
        // Description of the room. Appears in the info panel.
        // Markdown is supported.
        // Will be trimmed and dedented before being displayed.
        description: `
          This is an example of a description for a room.

          It can contain multiple paragraphs.
        `,
    
        // Points that describe the area on the map that the room covers.
        // Each point is an array of two numbers, the x and y coordinates of
        // the point on the map.
        // In the image co-oordinates. The origin is the top left corner of the
        // image.
        area: [
          [202, 499],
          [255, 499],
          [255, 550],
          [202, 550]
        ]
      }
    */
    rooms: [
      {
        id: "silent-room",
        label: "Silent room",
        aliases: ["Jackfield Boardroom"],
        description: `
          This is a room intended for sitting in silence, where no activities
          are allowed (including reading or using your phone). This will be
          available each day from 11am. Note, there may be noise leaking from
          neighbouring rooms, and the aircon makes some noise, so do bring noise
          cancelling headphones if you need complete silence.
        `,
        area: [
          [202, 499],
          [255, 499],
          [255, 550],
          [202, 550],
        ],
      },
      {
        id: "pattingham",
        label: "Pattingham",
        aliases: ["Programme"],
        description: `
          [Programme schedule](https://guide.eastercon2024.co.uk/pattingham)
        `,
        area: [
          [262, 470],
          [363, 470],
          [363, 550],
          [262, 550],
        ],
      },
      {
        id: "ops-help-desk",
        label: "Ops Help Desk",
        aliases: ["Beckbury 1", "Beckbury 2"],
        description: `
          If you need help with anything, this is the place to go. We can help
          with lost property, lost people, and any other issues you might have.
          This is also where the volunteers desk is.
          
          # Opening hours:
          
          Friday: 9:30am - 11:00pm
          
          Saturday: 9:30am-11pm
          
          Sunday: 9:30am-midnight
          
          Monday: 9:30am-11pm
        `,
        area: [
          [270, 655],
          [363, 655],
          [363, 728],
          [270, 728],
        ],
      },
      {
        id: "newsletter",
        label: "Newsletter",
        aliases: ["Beckbury 3"],
        description: `
          Office for the newsletter team. If you want to submit something to the
          newsletter, email
          [newsletter@eastercon2024.org](mailto:newsletter@eastercon2024.org).
        `,
        area: [
          [371, 655],
          [414, 655],
          [414, 728],
          [371, 728],
        ],
      },
      {
        id: "quiet-activities",
        label: "Quiet activities",
        aliases: ["Beckbury 4"],
        description: `
          A place where you may do a jigsaw or read a book/electronic item, but
          may not make phone calls.
        `,
        area: [
          [422, 655],
          [462, 655],
          [462, 728],
          [422, 728],
        ],
      },
      {
        id: "games",
        label: "Games",
        aliases: ["Ryton"],
        description: `
          Play games with friends, or make new friends by joining a game. There
          will be a selection of games available, or you can bring your own.
        `,
        area: [
          [884, 500],
          [942, 500],
          [942, 550],
          [884, 550],
        ],
      },
      {
        id: "toilets-ground-floor",
        label: "Toilets (ground floor)",
        aliases: [
          "Male toilets",
          "Female toilets",
          "Accessible toilets",
          "Disabled toilets",
        ],
        description: `
          Gender neutral toilets are available on the first floor.
        `,
        area: [
          [852, 344],
          [1055, 344],
          [1055, 382],
          [852, 382],
        ],
      },
      {
        id: "stairs-ground",
        label: "Stairs (ground floor)",
        area: [
          [311, 585],
          [484, 585],
          [484, 615],
          [311, 615],
        ],
      },
      {
        id: "lift-small-ground",
        label: "Lift (small, ground floor)",
        description: `
          This lift is small and can only fit one wheelchair user at a time.
          If you are able to, please take the stairs. If you need a larger lift,
          please use the lift near the E4 entrance.
        `,
        area: [
          [590, 585],
          [621, 585],
          [621, 615],
          [590, 615],
        ],
      },
      {
        id: "lift-large-ground",
        label: "Lift (large, ground floor)",
        description: `
          You will need to ask a member of staff to call the lift for you.
        `,
        area: [
          [1123, 149],
          [1193, 149],
          [1193, 209],
          [1123, 209],
        ],
      },
      {
        id: "e1",
        label: "E1",
        aliases: ["Entrance 1", "Car park"],
        description: `
          # Opening times
          
          Friday: 9:30am - 11:00pm
          
          Saturday: 9:30am-11pm
          
          Sunday: 9:30am-midnight
          
          Monday: 9:30am-11pm
        `,
        area: [
          [1008, 690],
          [1170, 690],
          [1170, 808],
          [1008, 808],
        ],
      },
      {
        id: "e2",
        label: "E2",
        aliases: ["Entrance 2"],
        description: `
          # Opening times
          
          Friday: 9:30am - 11:00pm
          
          Saturday: 9:30am-11pm
          
          Sunday: 9:30am-midnight
          
          Monday: 9:30am-11pm
        `,
        area: [
          [470, 654],
          [632, 654],
          [632, 808],
          [470, 808],
        ],
      },
      {
        id: "e3",
        label: "E3",
        aliases: ["Entrance 3"],
        area: [
          [44, 706],
          [233, 655],
          [233, 808],
          [44, 808],
        ],
      },
      {
        id: "e4",
        label: "E4",
        aliases: ["Entrance 4", "Hotels"],
        description: `
          # Opening times
          
          Friday: 9:30am - 11:00pm
          
          Saturday: 9:30am-11pm
          
          Sunday: 9:30am-midnight
          
          Monday: 9:30am-11pm
        `,
        area: [
          [1008, 35],
          [1170, 35],
          [1170, 150],
          [1008, 150],
        ],
      },
      {
        id: "ironbridge",
        label: "Ironbridge",
        aliases: ["Programme"],
        description: `
          [Programme schedule](https://guide.eastercon2024.co.uk/ironbridge)
        `,
        area: [
          [1321, 363],
          [1457, 363],
          [1457, 613],
          [1332, 647],
          [1321, 565],
        ],
      },
      {
        id: "dealers",
        label: "Dealers & Fan Tables",
        description: `
          A selection of dealers and fan tables will be available for you to
          browse. Please note that some dealers may only accept cash.
          
          # Opening times
          
          Friday: 2pm-7pm
          
          Saturday: 10am-6pm
          
          Sunday: 10am-6pm
          
          Monday: 10am-2pm
        `,
        area: [
          [1465, 363],
          [1576, 363],
          [1576, 426],
          [1608, 426],
          [1608, 544],
          [1465, 581],
        ],
      },
      {
        id: "childcare",
        label: "Childcare",
        description: `
          Childcare must have been pre-booked. If you have not pre-booked, you
          will not be able to use this service.
        `,
        area: [
          [1576, 363],
          [1576, 426],
          [1639, 426],
          [1639, 363],
        ],
      },
      {
        id: "art-show",
        label: "Art show",
        description: `
          The art show will be open from 10am-6pm each day. Please note that
          some pieces may be for sale.
          
          # Opening times
          
          Friday: Preview 4pm-5pm, sales open 5pm-7pm
          
          Saturday: 10am-6pm
          
          Sunday: 10am-5pm (collection of purchased art, 4pm-6:30pm)
        `,
        area: [
          [1639, 363],
          [1752, 363],
          [1752, 505],
          [1608, 544],
          [1608, 426],
          [1639, 426],
        ],
      },
      {
        id: "toilets-first-floor",
        label: "Toilets (first floor)",
        aliases: ["Urinals", "Without urinals", "Accessible"],
        description: `
          Gender neutral toilets with and without urinals.
        `,
        area: [
          [1760, 434],
          [1867, 434],
          [1867, 504],
          [1760, 504],
        ],
      },
      {
        id: "green-room",
        label: "Green room",
        description: `
          Programme participants should arrive at the green room 15 minutes
          before their item starts. Here you will meet with your fellow
          panellists (both in-person and online) and discuss the item before it
          starts. You will also be offered a complementary drink.
        `,
        area: [
          [1584, 674],
          [1677, 674],
          [1677, 747],
          [1584, 747],
        ],
      },
      {
        id: "Wenlock",
        label: "Wenlock",
        aliases: ["Programme"],
        description: `
          [Programme schedule](https://guide.eastercon2024.co.uk/wenlock)
        `,
        area: [
          [1685, 674],
          [1776, 674],
          [1776, 747],
          [1685, 747],
        ],
      },
      {
        id: "stairs-first",
        label: "Stairs (first floor)",
        area: [
          [1754, 588],
          [1933, 588],
          [1933, 618],
          [1754, 618],
        ],
      },
      {
        id: "lift-small-first",
        label: "Lift (small, first floor)",
        description: `
          This lift is small and can only fit one wheelchair user at a time. If
          you are able to, please take the stairs. If you need a larger lift,
          please use the lift near the E4 entrance.
        `,
        area: [
          [1993, 602],
          [2024, 593],
          [2024, 623],
          [1993, 623],
        ],
      },
      {
        id: "coalport",
        label: "Coalport",
        aliases: ["Programme"],
        description: `
          [Programme schedule](https://guide.eastercon2024.co.uk/coalport)
        `,
        area: [
          [1875, 434],
          [1977, 434],
          [1977, 504],
          [1875, 504],
        ],
      },
      {
        id: "gallary",
        label: "Gallary",
        aliases: ["Food & Drink", "Social space"],
        description: `
          A place to sit and chat with friends, or to grab a bite to eat. There
          will be a selection of food and drink available, including vegan and
          gluten free options.
        `,
        area: [
          [2029, 363],
          [2288, 363],
          [2288, 499],
          [2029, 499],
        ],
      },
      {
        id: "atcham",
        label: "Atcham",
        aliases: ["Programme"],
        description: `
          [Programme schedule](https://guide.eastercon2024.co.uk/atcham)
        `,
        area: [
          [2296, 363],
          [2397, 363],
          [2397, 493],
          [2296, 493],
        ],
      },
      {
        id: "lift-large-first",
        label: "Lift (large, first floor)",
        description: `
          You will need to ask a member of staff to call the lift for you.
        `,
        area: [
          [2405, 320],
          [2468, 320],
          [2468, 369],
          [2405, 369],
        ],
      },
    ],
  },
};

export default config;
