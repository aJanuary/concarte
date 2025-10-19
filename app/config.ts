import { Config } from "./config.types";

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
    background: "white",
    "highlight-background": "rgb(241 245 249)",
    border: "rgb(226 232 240)",
    "primary-text": "rgb(43, 43, 43)",
    "secondary-text": "rgb(100 116 139)",
    accent: "rgb(8,114,50)",
    disabled: "#cbd5e1",
  },
  filters: ["Toilets", "Lift", "Stairs"],
  overlays: [
    // Placeholder overlay reusing the ground floor image, just to test the
    // pill layout. Swap `src` for a real overlay image (e.g. a step-free
    // route) before shipping.
    { id: "test-overlay", label: "Step-free route", src: "/ground.png" },
  ],
  maps: [
    {
      id: "ground",
      label: "Ground floor",
      src: "/ground.png",
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
            [373, 551],
            [426, 551],
            [426, 602],
            [373, 602],
          ],
        },
        {
          id: "pattingham",
          label: "Pattingham",
          aliases: ["Programme"],
          description: `
          [Programme schedule](https://guide.example.co.uk/pattingham)
        `,
          area: [
            [433, 522],
            [534, 522],
            [534, 602],
            [433, 602],
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
            [441, 707],
            [534, 707],
            [534, 780],
            [441, 780],
          ],
        },
        {
          id: "newsletter",
          label: "Newsletter",
          aliases: ["Beckbury 3"],
          description: `
          Office for the newsletter team. If you want to submit something to the
          newsletter, email
          [newsletter@example.org](mailto:newsletter@example.org).
        `,
          area: [
            [542, 707],
            [585, 707],
            [585, 780],
            [542, 780],
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
            [593, 707],
            [633, 707],
            [633, 780],
            [593, 780],
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
            [1055, 552],
            [1113, 552],
            [1113, 602],
            [1055, 602],
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
            [1023, 396],
            [1226, 396],
            [1226, 434],
            [1023, 434],
          ],
        },
        {
          id: "stairs-ground",
          label: "Stairs (ground floor)",
          description: `
          Connects to [first floor](/map/first/room/stairs-first).
          `,
          area: [
            [482, 637],
            [655, 637],
            [655, 667],
            [482, 667],
          ],
        },
        {
          id: "lift-small-ground",
          label: "Lift (small, ground floor)",
          description: `
          This lift is small and can only fit one wheelchair user at a time.
          If you are able to, please take the stairs. If you need a larger lift,
          please use the lift near the E4 entrance.

          Connects to [first floor](/map/first/room/lift-small-first).
        `,
          area: [
            [761, 637],
            [792, 637],
            [792, 667],
            [761, 667],
          ],
        },
        {
          id: "lift-large-ground",
          label: "Lift (large, ground floor)",
          description: `
          You will need to ask a member of staff to call the lift for you.

          Connects to [first floor](/map/first/room/lift-large-first).
        `,
          area: [
            [1294, 201],
            [1364, 201],
            [1364, 261],
            [1294, 261],
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
            [1179, 742],
            [1341, 742],
            [1341, 860],
            [1179, 860],
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
            [641, 706],
            [803, 706],
            [803, 860],
            [641, 860],
          ],
        },
        {
          id: "e3",
          label: "E3",
          aliases: ["Entrance 3"],
          area: [
            [215, 758],
            [404, 707],
            [404, 860],
            [215, 860],
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
            [1179, 87],
            [1341, 87],
            [1341, 202],
            [1179, 202],
          ],
        },
      ],
    },
    {
      id: "first",
      label: "First floor",
      src: "/first.png",
      rooms: [
        {
          id: "ironbridge",
          label: "Ironbridge",
          aliases: ["Programme"],
          description: `
          [Programme schedule](https://guide.example.co.uk/ironbridge)
        `,
          area: [
            [86, 413],
            [222, 413],
            [222, 663],
            [97, 697],
            [86, 615],
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
            [230, 413],
            [341, 413],
            [341, 476],
            [373, 476],
            [373, 594],
            [230, 631],
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
            [341, 413],
            [341, 476],
            [404, 476],
            [404, 413],
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
            [404, 413],
            [517, 413],
            [517, 555],
            [373, 594],
            [373, 476],
            [404, 476],
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
            [525, 484],
            [632, 484],
            [632, 554],
            [525, 554],
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
            [349, 724],
            [442, 724],
            [442, 797],
            [349, 797],
          ],
        },
        {
          id: "Wenlock",
          label: "Wenlock",
          aliases: ["Programme"],
          description: `
          [Programme schedule](https://guide.example.co.uk/wenlock)
        `,
          area: [
            [450, 724],
            [541, 724],
            [541, 797],
            [450, 797],
          ],
        },
        {
          id: "stairs-first",
          label: "Stairs (first floor)",
          description: `
          Connects to [ground floor](/map/ground/room/stairs-ground).
          `,
          area: [
            [519, 638],
            [698, 638],
            [698, 668],
            [519, 668],
          ],
        },
        {
          id: "lift-small-first",
          label: "Lift (small, first floor)",
          description: `
          This lift is small and can only fit one wheelchair user at a time. If
          you are able to, please take the stairs. If you need a larger lift,
          please use the lift near the E4 entrance.

          Connects to [ground floor](/map/ground/room/lift-small-ground).
        `,
          area: [
            [758, 652],
            [789, 643],
            [789, 673],
            [758, 673],
          ],
        },
        {
          id: "coalport",
          label: "Coalport",
          aliases: ["Programme"],
          description: `
          [Programme schedule](https://guide.example.co.uk/coalport)
        `,
          area: [
            [640, 484],
            [742, 484],
            [742, 554],
            [640, 554],
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
            [794, 413],
            [1053, 413],
            [1053, 549],
            [794, 549],
          ],
        },
        {
          id: "atcham",
          label: "Atcham",
          aliases: ["Programme"],
          description: `
          [Programme schedule](https://guide.example.co.uk/atcham)
        `,
          area: [
            [1061, 413],
            [1162, 413],
            [1162, 543],
            [1061, 543],
          ],
        },
        {
          id: "lift-large-first",
          label: "Lift (large, first floor)",
          description: `
          You will need to ask a member of staff to call the lift for you.

          Connects to [ground floor](/map/ground/room/lift-large-ground).
        `,
          area: [
            [1170, 370],
            [1233, 370],
            [1233, 419],
            [1170, 419],
          ],
        },
      ],
    },
  ],
};

export default config;
