export type SuggestionCategory = 'Everyday' | 'Food & cravings' | 'Music & screen time' | 'School life' | 'Texting & socials' | 'Vibes & feelings' | 'Random & chaotic';

export interface Suggestion {
  prompt: string;
  options: string[];
  category: SuggestionCategory;
}

/** Question starters for Indian teens and Gen Z. Tap an idea, then customize it to sound like you. */
export const SUGGESTIONS: Suggestion[] = [
  // Everyday
  { category: 'Everyday', prompt: 'What do I do first when I finally get home?', options: ['Grab something to eat', 'Lie down immediately', 'Check my phone', 'Tell everyone what happened'] },
  { category: 'Everyday', prompt: 'What is my ideal kind of weekend?', options: ['Stay home and recharge', 'Go out with friends', 'A little bit of everything', 'Sleep and figure it out later'] },
  { category: 'Everyday', prompt: 'What do I always seem to lose?', options: ['Earphones', 'Water bottle', 'Hair tie / clip', 'My own train of thought'] },
  { category: 'Everyday', prompt: 'What time am I actually most awake?', options: ['Early morning', 'Afternoon', 'Late evening', 'After midnight for no reason'] },
  { category: 'Everyday', prompt: 'What is my most-used app?', options: ['Instagram', 'YouTube', 'WhatsApp', 'Spotify / music app'] },
  { category: 'Everyday', prompt: 'If I got a completely free day, I would…', options: ['Sleep in', 'Go somewhere', 'Watch stuff all day', 'Start a random new hobby'] },
  { category: 'Everyday', prompt: 'What is one thing I always carry?', options: ['Earphones', 'Lip balm / skincare', 'A charger', 'Snacks, obviously'] },
  { category: 'Everyday', prompt: 'What kind of shopper am I?', options: ['I plan before buying', 'I add to cart and forget', 'I buy it if it is cute', 'I need 47 opinions first'] },
  { category: 'Everyday', prompt: 'What would I spend unexpected ₹1,000 on?', options: ['Food and snacks', 'Clothes or accessories', 'Something techy', 'Save it… maybe'] },
  { category: 'Everyday', prompt: 'What is my most predictable habit?', options: ['Overthinking tiny things', 'Being late', 'Making lists I ignore', 'Saying “one last video”'] },
  { category: 'Everyday', prompt: 'What is my relationship with alarms?', options: ['Wake up on the first one', 'Snooze twice', 'Snooze ten times', 'Set alarms and still wake up late'] },
  { category: 'Everyday', prompt: 'What am I most likely doing at 11 PM?', options: ['Studying', 'Scrolling reels', 'Listening to music', 'Having a life crisis / deep thoughts'] },

  // Food
  { category: 'Food & cravings', prompt: 'What would I probably order at 2 AM?', options: ['🍕 Pizza', '🍜 Noodles / Maggi', '🍔 Burger', '🍛 Biriyani'] },
  { category: 'Food & cravings', prompt: 'What is my ultimate comfort food?', options: ['🍜 Maggi', '🍚 Biriyani', '🥞 Dosa', '🍦 Ice cream'] },
  { category: 'Food & cravings', prompt: 'Which dessert would I pick without thinking?', options: ['🍫 Brownie', '🍰 Cake', '🍨 Ice cream', '🍮 Gulab jamun'] },
  { category: 'Food & cravings', prompt: 'Which chocolate / candy would I pick first?', options: ['🍫 Dairy Milk', '🥜 Snickers', '🍬 Gems', '🍫 KitKat'] },
  { category: 'Food & cravings', prompt: 'What is my ideal drink?', options: ['🧋 Cold coffee / frappe', '🧋 Bubble tea', '🥤 Sprite / Coke', '☕ Chai'] },
  { category: 'Food & cravings', prompt: 'What snack wins when I am bored?', options: ['Chips', 'Biscuits', 'Chocolate', 'Whatever is in the kitchen'] },
  { category: 'Food & cravings', prompt: 'What is my spice tolerance?', options: ['No spice, please', 'A little kick', 'Extra spicy', 'I regret nothing'] },
  { category: 'Food & cravings', prompt: 'At a bakery, what am I grabbing?', options: ['Puff', 'Brownie / pastry', 'Puffs and a drink', 'I came for one thing, leave with six'] },
  { category: 'Food & cravings', prompt: 'What is my perfect street-food stop?', options: ['Momos', 'Pani puri / chaat', 'Shawarma / rolls', 'Bajji / samosa'] },
  { category: 'Food & cravings', prompt: 'If we order food together, I am the one who…', options: ['Knows exactly what to get', 'Steals everyone’s fries', 'Says “anything” then rejects everything', 'Orders the same thing every time'] },
  { category: 'Food & cravings', prompt: 'Sweet or savoury?', options: ['Sweet, always', 'Savoury, always', 'Depends on my mood', 'Both at the same time'] },
  { category: 'Food & cravings', prompt: 'What would I choose for a treat?', options: ['Ice cream run', 'Cafe date', 'Street food', 'A full meal, no debate'] },

  // Music and screen
  { category: 'Music & screen time', prompt: 'What type of music do I listen to the most?', options: ['Tamil / Telugu hits', 'Hindi hits', 'English pop', 'A bit of literally everything'] },
  { category: 'Music & screen time', prompt: 'What is my music-listening style?', options: ['Same song on repeat', 'Playlists for every mood', 'Whatever the algorithm gives me', 'I listen to the same 2019 songs'] },
  { category: 'Music & screen time', prompt: 'When do I listen to music the most?', options: ['While travelling', 'While studying', 'Before sleeping', 'Whenever I need to feel something'] },
  { category: 'Music & screen time', prompt: 'What would I put on for a long journey?', options: ['A playlist', 'A podcast', 'A movie / series downloaded', 'Stare out the window dramatically'] },
  { category: 'Music & screen time', prompt: 'What kind of videos trap me for an hour?', options: ['Comedy / memes', 'Music edits', 'Storytimes / drama', 'Random facts and rabbit holes'] },
  { category: 'Music & screen time', prompt: 'What would I rather watch tonight?', options: ['Comedy', 'Thriller / mystery', 'Horror', 'Romance / comfort show'] },
  { category: 'Music & screen time', prompt: 'Which cartoon would I happily rewatch?', options: ['Doraemon', 'Shin-chan', 'Tom and Jerry', 'Chhota Bheem'] },
  { category: 'Music & screen time', prompt: 'Which childhood show feels nostalgic to me?', options: ['Motu Patlu', 'Oggy and the Cockroaches', 'Pokemon', 'Best of Luck Nikki / Disney shows'] },
  { category: 'Music & screen time', prompt: 'What is my ideal background noise?', options: ['Music', 'A comfort show', 'Rain / silence', 'People talking while I do my thing'] },
  { category: 'Music & screen time', prompt: 'What genre would my life soundtrack be?', options: ['Rom-com', 'Coming-of-age', 'Action movie', 'Chaotic sitcom'] },
  { category: 'Music & screen time', prompt: 'What am I most likely to binge?', options: ['A series in one night', 'YouTube for hours', 'Anime / cartoons', 'Reels until my battery begs'] },

  // School
  { category: 'School life', prompt: 'When do I usually start studying for an exam?', options: ['A week before', 'Three days before', 'The night before', 'I believe in exam-hall miracles'] },
  { category: 'School life', prompt: 'What is my exam-eve personality?', options: ['Calm and prepared', 'Making colour-coded notes', 'Panic-cleaning my desk', 'Asking “what all is coming?” at midnight'] },
  { category: 'School life', prompt: 'What kind of student am I in class?', options: ['Front-bencher energy', 'Quiet but listening', 'Friends with everyone', 'Physically present, mentally elsewhere'] },
  { category: 'School life', prompt: 'What do I do when the teacher says “surprise test”?', options: ['Smile, I studied', 'Try to remember something', 'Look at my friends for help', 'Accept my fate'] },
  { category: 'School life', prompt: 'Which part of group projects sounds most like me?', options: ['I organise everything', 'I make the slides look good', 'I do the research', 'I appear near the deadline with a miracle'] },
  { category: 'School life', prompt: 'What is my usual reason for being late?', options: ['Overslept', 'Could not find my stuff', 'Traffic / transport', '“I was literally about to leave”'] },
  { category: 'School life', prompt: 'What would I do with a free period?', options: ['Finish pending work', 'Talk to friends', 'Eat something', 'Rest my eyes for “one minute”'] },
  { category: 'School life', prompt: 'Which subject energy do I have?', options: ['Maths / logic', 'Science', 'Languages / writing', 'Practical work over theory'] },
  { category: 'School life', prompt: 'How do I take notes?', options: ['Neat and organised', 'Messy but I understand it', 'Borrow a friend’s notes later', 'I trust my memory too much'] },
  { category: 'School life', prompt: 'What is my post-exam ritual?', options: ['Compare answers immediately', 'Forget the paper exists', 'Celebrate with food', 'Worry about the next exam'] },

  // Texting/socials
  { category: 'Texting & socials', prompt: 'How do I usually text?', options: ['One long paragraph', 'Many tiny messages', 'Voice notes', 'Memes instead of words'] },
  { category: 'Texting & socials', prompt: 'How quickly do I reply?', options: ['Instantly', 'When I see the notification', 'In 3–5 business days', 'I reply in my head and forget to send'] },
  { category: 'Texting & socials', prompt: 'What is my texting signature?', options: ['“😭😭😭”', '“bro” in every sentence', 'Voice notes with no context', 'Just sends reels'] },
  { category: 'Texting & socials', prompt: 'What do I do when someone says “we need to talk”?', options: ['Ask what happened immediately', 'Overthink every interaction', 'Call them right away', 'Pretend I did not see it'] },
  { category: 'Texting & socials', prompt: 'What kind of Instagram story do I post?', options: ['Songs / lyrics', 'Random daily life', 'Memes', 'I watch stories; posting is rare'] },
  { category: 'Texting & socials', prompt: 'What is my most likely reason to send a reel?', options: ['It reminded me of you', 'It is painfully relatable', 'I need you to see this chaos', 'I send reels instead of checking in'] },
  { category: 'Texting & socials', prompt: 'In a group chat, I am usually…', options: ['The active one', 'The one who reacts only', 'The meme supplier', 'Muted but somehow knows everything'] },
  { category: 'Texting & socials', prompt: 'How do I handle a phone call?', options: ['Call me anytime', 'Text first, please', 'Only calls from close people', 'I let it ring and text “what happened?”'] },
  { category: 'Texting & socials', prompt: 'What is my screenshot habit?', options: ['Screenshots everything', 'Sends screenshots to the group', 'Never screenshots', 'Screenshots, then forgets why'] },
  { category: 'Texting & socials', prompt: 'What does my “seen” usually mean?', options: ['I am thinking of a reply', 'I got distracted', 'I will reply later (maybe)', 'I have no idea what to say'] },

  // Vibes and feelings
  { category: 'Vibes & feelings', prompt: 'What usually helps me relax?', options: ['Listening to music', 'Sleeping', 'Talking to someone I trust', 'Being alone with no notifications'] },
  { category: 'Vibes & feelings', prompt: 'What makes me happy really quickly?', options: ['My favourite food', 'A thoughtful message', 'Plans with my people', 'Getting something I wanted'] },
  { category: 'Vibes & feelings', prompt: 'When I am stressed, I usually…', options: ['Talk it out', 'Go quiet for a while', 'Make a plan', 'Distract myself with videos'] },
  { category: 'Vibes & feelings', prompt: 'How do I show I care about someone?', options: ['Remember tiny details', 'Send them things that remind me of them', 'Help them solve stuff', 'Tease them lovingly'] },
  { category: 'Vibes & feelings', prompt: 'What is my ideal way to recharge?', options: ['Alone time', 'A hangout with my favourite people', 'A long walk / drive', 'Music and doing absolutely nothing'] },
  { category: 'Vibes & feelings', prompt: 'What compliment would make my day?', options: ['You are good at what you do', 'You make people feel included', 'You look nice today', 'You make life more fun'] },
  { category: 'Vibes & feelings', prompt: 'What is most likely to make me emotional?', options: ['A heartfelt message', 'A movie scene', 'Nostalgic songs', 'I act unbothered but feel everything'] },
  { category: 'Vibes & feelings', prompt: 'When plans get cancelled, I feel…', options: ['Relieved, honestly', 'A little disappointed', 'Ready to make new plans', 'Depends who cancelled'] },
  { category: 'Vibes & feelings', prompt: 'What kind of friend am I when you have a bad day?', options: ['I listen', 'I try to fix the problem', 'I make you laugh', 'I bring snacks and stay nearby'] },
  { category: 'Vibes & feelings', prompt: 'What gives me instant ick?', options: ['Rudeness to staff', 'Fake behaviour', 'Loud chewing', 'People who never listen'] },
  { category: 'Vibes & feelings', prompt: 'What is my biggest comfort?', options: ['My favourite people', 'My bed', 'Music', 'A familiar routine'] },

  // Random
  { category: 'Random & chaotic', prompt: 'If I suddenly got ₹10,000, what would I do?', options: ['Save most of it', 'Buy something I have wanted', 'Spend it on food and plans', 'Make a plan, then impulse-buy anyway'] },
  { category: 'Random & chaotic', prompt: 'If I could instantly master one skill, what would I choose?', options: ['Singing / music', 'Dancing', 'Cooking', 'A skill that makes me rich'] },
  { category: 'Random & chaotic', prompt: 'What would I be doing in a zombie apocalypse?', options: ['Making a survival plan', 'Protecting the group', 'Panicking but running fast', 'Somehow becoming the problem'] },
  { category: 'Random & chaotic', prompt: 'What would I most likely go viral for?', options: ['Something genuinely talented', 'A funny accident', 'A random opinion', 'I would never recover from the comments'] },
  { category: 'Random & chaotic', prompt: 'If I had a warning label, what would it say?', options: ['Needs snacks', 'Overthinks everything', 'May disappear to recharge', 'Do not take seriously before coffee'] },
  { category: 'Random & chaotic', prompt: 'Which superpower would I choose?', options: ['Teleportation', 'Read minds', 'Pause time', 'Unlimited money — technically a superpower'] },
  { category: 'Random & chaotic', prompt: 'What would I do if I became invisible for a day?', options: ['Explore places', 'Prank my friends', 'Avoid everyone', 'Probably waste the whole day'] },
  { category: 'Random & chaotic', prompt: 'Which role would I have in a friend-group heist movie?', options: ['The mastermind', 'The tech person', 'The driver', 'The one who messes up the plan'] },
  { category: 'Random & chaotic', prompt: 'What am I most likely to say?', options: ['“Wait, listen”', '“I am so tired”', '“One last thing”', '“It is what it is”'] },
  { category: 'Random & chaotic', prompt: 'What is my most likely impulse decision?', options: ['Cut / change my hair', 'Order food', 'Buy something online', 'Agree to plans then regret leaving home'] },
  { category: 'Random & chaotic', prompt: 'Pick my dream mini getaway.', options: ['Beach with snacks', 'Hills and cool weather', 'Big city and shopping', 'A quiet stay with no schedule'] },
  { category: 'Random & chaotic', prompt: 'If my life had a group-chat name, it would be…', options: ['No Context', 'Last Minute Legends', 'Mentally on Airplane Mode', 'We Need to Talk'] },
];

export const CATEGORIES: Array<'All vibes' | SuggestionCategory> = [
  'All vibes', 'Everyday', 'Food & cravings', 'Music & screen time', 'School life', 'Texting & socials', 'Vibes & feelings', 'Random & chaotic',
];

/** The eight prefilled when someone taps "Start with 8 ideas". */
export const STARTER_PACK: number[] = [0, 12, 14, 30, 35, 40, 51, 61];
