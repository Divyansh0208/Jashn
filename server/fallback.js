import { split } from "./plan.js";

// Offline planner: same shape as the Gemini output, so normalize() and the UI treat both alike.
// budget [name, weight, note, focus] · timeline [daysBefore, task]
// vendors [name, leadDays, budgetName, tip, q1, q2, q3] · ideas [title, desc]
const DATA = {
  wedding: {
    label: "Wedding",
    budget: [
      ["Venue and rentals", 20, "Hall, lawn or resort, furniture, power backup.", "Venue"],
      ["Food and catering", 30, "Per-plate menu across all functions, plus service staff.", "Food"],
      ["Decor and flowers", 10, "Mandap, stage, entry and floral styling.", "Decor"],
      ["Photography and video", 9, "Photographer, videographer, album.", "Photography"],
      ["Music and entertainment", 6, "DJ or band, sound, dhol, sangeet performers.", "Music"],
      ["Attire, jewellery and beauty", 10, "Outfits, alterations, makeup and hair.", "Attire"],
      ["Invitations and gifts", 3, "Cards or e-invites, return gifts, shagun envelopes."],
      ["Travel and guest stay", 6, "Rooms and transport for outstation guests.", "Travel and stay"],
      ["Contingency", 9, "Held back for price rises and surprises."],
    ],
    timeline: [
      [300, "Fix guest count range and your top three priorities"],
      [270, "Confirm the budget and who pays for what"],
      [240, "Check muhurat dates with both families and the pandit"],
      [240, "Shortlist and visit venues"],
      [210, "Book the venue and photographer"],
      [180, "Hold a tasting and book the caterer"],
      [150, "Order wedding outfits and jewellery"],
      [120, "Book decorator and music"],
      [100, "Block rooms and transport for outstation guests"],
      [75, "Print and send invitations"],
      [45, "Final fittings and beauty trials"],
      [30, "Collect RSVPs and confirm the headcount"],
      [14, "Confirm every vendor and plan final payments"],
      [7, "Share the day-of schedule with vendors and family"],
      [1, "Rehearsal, emergency kit and labelled payment envelopes"],
      [0, "Wedding day: name one point person for vendors"],
      [-10, "Send thank-you messages and settle final invoices"],
    ],
    vendors: [
      ["Venue", 240, "Venue and rentals", "Ask for weekday or off-season dates; peak muhurat dates cost the most.", "Is outside catering and decor allowed?", "What are the power backup and parking limits?", "What is the rain or heat backup plan?"],
      ["Photography and video", 210, "Photography and video", "Ask to see two complete wedding albums, not highlight reels.", "How many hours are covered and what does overtime cost?", "When are edited photos delivered?", "Do you bring a backup photographer?"],
      ["Caterer", 180, "Food and catering", "Fix the per-plate price in writing and taste before you book.", "What is included per plate: service, taxes, crockery?", "How are Jain or no-onion-garlic needs handled?", "What is the staff-to-guest ratio?"],
      ["Decorator", 120, "Decor and flowers", "Pick seasonal flowers; imported ones can double the cost.", "Which items are rented and which are bought?", "What are setup and pickup charges?", "Can ceremony decor move to the reception?"],
      ["Music and DJ", 120, "Music and entertainment", "Share a must-play and do-not-play list at booking.", "What equipment and power do you need?", "What is the overtime rate?", "Is there a backup if a member falls ill?"],
      ["Outfits and jewellery", 150, "Attire, jewellery and beauty", "Order early; alterations take longer than delivery.", "How many fittings are included?", "What is the full delivery timeline?", "What is the change policy close to the date?"],
      ["Guest stay and transport", 100, "Travel and guest stay", "Get the room release date in writing before you pay.", "How many rooms are held, and until when?", "Is a shuttle included?", "What are check-in and check-out times on event day?"],
    ],
    ideas: [
      ["Seasonal marigold and jasmine decor", "Local seasonal flowers cost less and smell better than imported ones."],
      ["Sunset pheras or vows", "Time the ceremony for soft light in photographs and cooler guests."],
      ["Live chaat and dessert counters", "Stations keep guests mingling and cut queues at the buffet."],
      ["Welcome kit for outstation guests", "Snacks, a map and the schedule in one bag save many phone calls."],
      ["Voice-note guest book", "Record short blessings from elders; they outlast any album."],
    ],
  },
  birthday: {
    label: "Birthday",
    budget: [
      ["Venue", 22, "Banquet, terrace, club room or home setup.", "Venue"],
      ["Food and cake", 32, "Snacks or meal, drinks and the cake.", "Food"],
      ["Decor and balloons", 12, "Theme setup, backdrop, lights.", "Decor"],
      ["Entertainment and games", 12, "Host, magician, DJ or game stations.", "Music"],
      ["Photography", 6, "Photographer or a friend with a good camera.", "Photography"],
      ["Return gifts", 8, "One small gift per guest or family."],
      ["Invitations and extras", 3, "E-invites, candles, disposables."],
      ["Contingency", 8, "Held back for surprises."],
    ],
    timeline: [
      [45, "Set the date, guest list and theme"],
      [35, "Book the venue"],
      [30, "Send invitations on WhatsApp"],
      [21, "Book entertainer or DJ and the decorator"],
      [14, "Finalise the menu and order the cake"],
      [10, "Collect RSVPs"],
      [7, "Confirm vendors and buy return gifts"],
      [3, "Give the caterer the final headcount"],
      [1, "Pack decor and an emergency kit"],
      [0, "Party day: name one helper for vendors"],
      [-3, "Thank guests and settle payments"],
    ],
    vendors: [
      ["Venue", 35, "Venue", "Ask what is included before you pay: tables, power, cleaning.", "What are the time slots and overtime charges?", "Can we bring our own cake and decor?", "What is the cancellation policy?"],
      ["Caterer and cake", 14, "Food and cake", "Order the cake a week early and confirm the flavour in writing.", "What is the per-head price with taxes?", "Can you do kid-friendly and jain options?", "When do you need the final count?"],
      ["Decorator", 21, "Decor and balloons", "Share a photo of the look you want; it avoids surprises.", "What is the setup and pickup time?", "What happens if balloons burst early?", "Is there a theme package?"],
      ["Entertainer or DJ", 21, "Entertainment and games", "Ask for a short act plan with timings.", "How long is the programme?", "What equipment do you bring?", "Do you have experience with this age group?"],
      ["Photographer", 21, "Photography", "Fix the delivery date and number of edited photos.", "How many hours are covered?", "When will photos be delivered?", "Do I get the raw files?"],
    ],
    ideas: [
      ["One colour palette, one theme", "Fewer props in one palette look better in photos than many themes."],
      ["Game stations by age group", "Small stations stop kids from crowding one activity."],
      ["Build-your-own dessert table", "Guests make their own plates and the table doubles as decor."],
      ["Photo corner with props", "A backdrop and a prop box gives everyone a keepsake."],
      ["Return gifts that double as activities", "Seed kits or colouring sets keep kids busy and save a separate game."],
    ],
  },
  community: {
    label: "Community event",
    budget: [
      ["Venue and permissions", 20, "Ground or hall, police and society permissions.", "Venue"],
      ["Food and prasad", 30, "Meal, snacks, water and prasad.", "Food"],
      ["Stage, sound and lights", 15, "Stage, mics, speakers, generator.", "Music"],
      ["Decor and signage", 10, "Entry gate, banners, stage decor.", "Decor"],
      ["Publicity and printing", 6, "Posters, passes, social media."],
      ["Volunteers, safety and first aid", 7, "Volunteer tees, first aid, fire safety."],
      ["Gifts and prizes", 5, "Prizes, mementos, thank-you gifts."],
      ["Photography", 3, "Event coverage for records and reports.", "Photography"],
      ["Contingency", 8, "Held back for surprises and weather."],
    ],
    timeline: [
      [60, "Form the committee and assign leads"],
      [50, "Confirm funding sources and collections"],
      [45, "Apply for police, society and sound permissions"],
      [40, "Book the venue and sound"],
      [30, "Book caterer and decorator"],
      [21, "Publicise on WhatsApp groups and posters"],
      [14, "Make the volunteer roster with clear duties"],
      [7, "Confirm vendors, first aid and parking"],
      [3, "Test sound and lights"],
      [1, "Set up and do a full walkthrough"],
      [0, "Event day: one coordinator, one backup"],
      [-7, "Thank sponsors and share the accounts"],
    ],
    vendors: [
      ["Venue and permissions", 45, "Venue and permissions", "Start permissions first; they are the slowest step.", "Which permissions are needed, and how long do they take?", "What are the noise and end-time limits?", "Is there a rain plan?"],
      ["Sound and lights", 40, "Stage, sound and lights", "Ask for a generator backup in the quote.", "What is the power requirement?", "Do you test on site the day before?", "What is the overtime rate?"],
      ["Caterer", 30, "Food and prasad", "Agree a per-plate rate and a wastage buffer of about 10 percent.", "How do you handle bulk serving and queues?", "Is water and cleanup included?", "How are dietary needs covered?"],
      ["Decorator", 30, "Decor and signage", "Reuse banners across days to save cost.", "What is the setup and pickup schedule?", "Which items are rented?", "What is the damage policy?"],
      ["Printer", 21, "Publicity and printing", "Order passes and posters together for a better rate.", "What is the minimum order?", "How long is printing with rush?", "Can you share a proof first?"],
    ],
    ideas: [
      ["Volunteer shifts with named leads", "Short shifts keep people fresh and make gaps visible early."],
      ["Public accounts after the event", "Sharing income and spend builds trust for next year."],
      ["Eco-friendly serveware", "Leaf plates and steel glasses cut waste and cleanup time."],
      ["Kids' corner", "A small supervised area lets families stay longer."],
      ["Rain and heat plan", "Decide shade, tents and a fallback hall before the date, not on it."],
    ],
  },
};
DATA.other = { ...DATA.community, label: "Event" };

const dmy = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function buildFallback(i) {
  const d = DATA[i.type];
  const boost = (b) => b[1] * (b[3] && i.focus.includes(b[3]) ? 1.4 : 1);
  const amounts = split(i.budget, d.budget.map(boost));
  const budget = d.budget.map((b, k) => ({ category: b[0], amount: amounts[k], note: b[2] }));
  const cost = Object.fromEntries(budget.map((b) => [b.category, b.amount]));
  const kind = d.label.toLowerCase();
  const perGuest = new Intl.NumberFormat("en-IN").format(Math.round(i.budget / i.guests));
  return {
    title: `${d.label} in ${i.city}`,
    summary: `Built-in plan for ${i.guests} guests on ${dmy(i.date)}, about ₹${perGuest} per guest. Tasks are dated back from the event.`,
    budget,
    timeline: d.timeline.map(([daysBefore, task]) => ({ daysBefore, task })),
    vendors: d.vendors.map(([type, leadDays, cat, tip, ...questions]) => ({
      type, tip, leadDays, questions,
      estCost: cost[cat] ?? 0,
      draft: `Namaste, I am planning a ${kind} in ${i.city} on ${dmy(i.date)} for about ${i.guests} guests. Could you share your availability and a quote for ${type.toLowerCase()}? Happy to speak on a call if easier. Thank you, [Your name]`,
    })),
    ideas: d.ideas.map(([title, desc]) => ({ title, desc })),
    changes: [],
  };
}
