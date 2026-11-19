// Fills the database with sample students and classes for demos.
// All people below are fictional. Emails use roll-number-style addresses on uohyd.ac.in.
// WARNING: this deletes all existing users, classes and payments first.
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import { config } from './config/index.js';
import { Payment } from './models/Payment.js';
import { Session } from './models/Session.js';
import { User } from './models/User.js';

const PASSWORD = 'password123';
const UNIVERSITY = 'University of Hyderabad';
const EMAIL_DOMAIN = 'uohyd.ac.in';
const ADMISSION_YEAR = '25';
const DEMO_EMAIL = `${ADMISSION_YEAR}cs01@${EMAIL_DOMAIN}`;

const [B, I, A] = ['beginner', 'intermediate', 'advanced'];
const skill = (name, level) => ({ name, level });

// Keyed by first name (unique below); email is a roll number like "25cs01@uohyd.ac.in" (see emailOf below).
const students = [
  {
    name: 'Aarav Sharma', department: 'Computer Science',
    bio: 'MTech CS, 1st year, from Lucknow. I build web apps and love problem solving. Trying to learn Telugu and pick up the guitar before my first Hyderabad monsoon.',
    offered: [skill('Python', A), skill('Data Structures', A), skill('React', I)],
    wanted: [skill('Telugu', B), skill('Guitar', B), skill('UI Design', B), skill('Public Speaking', B)],
  },
  {
    name: 'Sai Teja Reddy', department: 'Computer Science',
    bio: 'MCA final year from Warangal. Placement season is close, so I practise competitive programming daily. Happy to help with Java and SQL.',
    offered: [skill('Java', A), skill('SQL', A), skill('Competitive Programming', I)],
    wanted: [skill('Public Speaking', B), skill('Photography', B)],
  },
  {
    name: 'Harini Venkatesh', department: 'Computer Science',
    bio: 'MTech AI from Chennai. Working on handwriting recognition for Tamil. I can teach ML basics; I want to speak better Hindi with my hostel friends.',
    offered: [skill('Machine Learning', I), skill('Python', A), skill('Tamil', A)],
    wanted: [skill('Hindi', B), skill('Figma', B)],
  },
  {
    name: 'Arjun Menon', department: 'Computer Science',
    bio: 'MCA from Kochi. Backend developer, mostly Node and MongoDB. I shoot street photography on weekends but I am self-taught and stuck.',
    offered: [skill('Node.js', A), skill('MongoDB', I), skill('Malayalam', A)],
    wanted: [skill('Photography', B), skill('UI Design', B)],
  },
  {
    name: 'Ananya Banerjee', department: 'Physics',
    bio: 'MSc Physics, 2nd year, from Kolkata. Quantum mechanics by day, Rabindra Sangeet by night. I need Python for my dissertation simulations.',
    offered: [skill('Quantum Mechanics', A), skill('LaTeX', A), skill('Rabindra Sangeet', I), skill('Bengali', A)],
    wanted: [skill('Python', B), skill('Data Analysis', B)],
  },
  {
    name: 'Rishabh Agarwal', department: 'Physics',
    bio: 'PhD scholar in condensed matter, from Jaipur. State-level chess player. I tutor first-year physics and want to finally learn the guitar.',
    offered: [skill('Chess', A), skill('Physics Tutoring', A), skill('Python', I)],
    wanted: [skill('Guitar', B), skill('Public Speaking', I)],
  },
  {
    name: 'Rohan Deshmukh', department: 'Chemistry',
    bio: 'MSc Chemistry, 1st year, from Pune. Organic chemistry is my thing. I want to analyse lab data properly instead of fighting with spreadsheets.',
    offered: [skill('Organic Chemistry', A), skill('Marathi', A), skill('Chess', I)],
    wanted: [skill('Data Analysis', B), skill('Guitar', B)],
  },
  {
    name: 'Fathima Rahman', department: 'Biochemistry',
    bio: 'MSc Biochemistry from Kozhikode. I live in the lab running PCRs. Can help with lab techniques; need help with Python for my data.',
    offered: [skill('Lab Techniques', A), skill('Malayalam', A), skill('Biostatistics', I)],
    wanted: [skill('Python', B), skill('Academic Writing', I)],
  },
  {
    name: 'Shreya Pillai', department: 'Animal Biology',
    bio: 'PhD scholar from Thiruvananthapuram. Bioinformatics pipelines and fieldwork. Learning to write papers faster and cut a decent conference video.',
    offered: [skill('Bioinformatics', A), skill('Linux', I), skill('Field Research', I)],
    wanted: [skill('Academic Writing', I), skill('Video Editing', B)],
  },
  {
    name: 'Karthik Subramanian', department: 'Plant Sciences',
    bio: 'MSc Plant Sciences from Madurai. Carnatic vocalist since I was seven. Would love to learn programming to automate my image analysis.',
    offered: [skill('Carnatic Vocals', A), skill('Plant Taxonomy', I), skill('Tamil', A)],
    wanted: [skill('Python', B), skill('Photography', B)],
  },
  {
    name: 'Ishita Mukherjee', department: 'Psychology',
    bio: 'MA Psychology from Siliguri. I design experiments and write them up. Can teach research methods and SPSS; I want Python for my analysis.',
    offered: [skill('Research Methods', A), skill('SPSS', A), skill('Academic Writing', A)],
    wanted: [skill('Python', B), skill('Public Speaking', I)],
  },
  {
    name: 'Zoya Khan', department: 'English',
    bio: 'MA English, 1st year, from Lucknow. Poetry reader and slam performer. I can help with creative writing and stage confidence; I want to build my own portfolio site.',
    offered: [skill('Creative Writing', A), skill('Public Speaking', A), skill('Urdu Poetry', I)],
    wanted: [skill('React', B), skill('Video Editing', B)],
  },
  {
    name: 'Lakshmi Prasanna', department: 'Telugu',
    bio: 'MA Telugu from Guntur. Kuchipudi dancer, and I write Telugu short stories. Teach me some coding, please!',
    offered: [skill('Telugu', A), skill('Kuchipudi', I), skill('Creative Writing', I)],
    wanted: [skill('Python', B), skill('Photography', B)],
  },
  {
    name: 'Mohammed Faizan', department: 'Urdu',
    bio: 'MA Urdu from the Old City, Hyderabad. Calligraphy and ghazals. Looking for someone to teach me Python basics and help me present with confidence.',
    offered: [skill('Urdu', A), skill('Urdu Calligraphy', I), skill('Hindi', A)],
    wanted: [skill('Python', B), skill('Public Speaking', I)],
  },
  {
    name: 'Sameer Qureshi', department: 'Economics',
    bio: 'MA Economics, born and raised in Hyderabad. Makes a serious dum biryani and plays gully cricket every Sunday. Want data skills for my econometrics project.',
    offered: [skill('Hyderabadi Cooking', A), skill('Cricket', A), skill('Econometrics', I)],
    wanted: [skill('Python', B), skill('Public Speaking', B)],
  },
  {
    name: 'Gurpreet Singh', department: 'Economics',
    bio: 'MA Economics, 2nd year, from Ludhiana. Excel and Stata nerd. I can also teach you Punjabi and a proper butter chicken.',
    offered: [skill('Excel', A), skill('Stata', I), skill('Punjabi', A), skill('North Indian Cooking', I)],
    wanted: [skill('Guitar', B), skill('Data Visualization', B)],
  },
  {
    name: 'Vikram Rathore', department: 'Political Science',
    bio: 'MA Political Science from Jodhpur. Preparing for UPSC. I debate a lot and can help with public speaking and Indian polity.',
    offered: [skill('UPSC Preparation', I), skill('Public Speaking', A), skill('Indian Polity', A)],
    wanted: [skill('Excel', B), skill('Python', B)],
  },
  {
    name: 'Joseph Thomas', department: 'Sociology',
    bio: 'MA Sociology from Kottayam. I play guitar in a campus band. Want to practise my Hindi and learn some coding for qualitative data tools.',
    offered: [skill('Guitar', A), skill('Research Methods', I), skill('Malayalam', A)],
    wanted: [skill('Hindi', B), skill('Python', B)],
  },
  {
    name: 'Priyanka Das', department: 'Anthropology',
    bio: 'PhD scholar from Guwahati. Ethnographic fieldwork and documentary photography. I need help with data tools and editing my field films.',
    offered: [skill('Photography', A), skill('Assamese', A), skill('Ethnographic Fieldwork', A)],
    wanted: [skill('Data Analysis', B), skill('Video Editing', B)],
  },
  {
    name: 'Tenzin Dolma', department: 'Linguistics',
    bio: 'MA Linguistics from Gangtok. I make excellent momos and speak Tibetan and Nepali. Hoping to learn Python for corpus analysis.',
    offered: [skill('Momo Cooking', A), skill('Nepali', A), skill('Tibetan', I)],
    wanted: [skill('Python', B), skill('Hindi', I)],
  },
  {
    name: 'Nikhil Joshi', department: 'Mathematics',
    bio: 'MSc Mathematics from Nashik, preparing for CSIR-UGC NET. I tutor linear algebra and calculus. Want to learn guitar and get better at chess.',
    offered: [skill('Linear Algebra', A), skill('Calculus', A), skill('Real Analysis', I)],
    wanted: [skill('Guitar', B), skill('Chess', B)],
  },
  {
    name: 'Aditi Kulkarni', department: 'Statistics',
    bio: 'MSc Statistics from Kolhapur. R and probability are my comfort zone. I would like to be more confident presenting my work.',
    offered: [skill('Statistics', A), skill('R Programming', A), skill('Marathi', A)],
    wanted: [skill('Public Speaking', B), skill('Python', I)],
  },
  {
    name: 'Imran Ali', department: 'Communication',
    bio: 'MA Communication from Secunderabad. Video editor and podcaster. I can teach Premiere and storytelling; I want to learn data journalism.',
    offered: [skill('Video Editing', A), skill('Podcasting', I), skill('Photography', I), skill('Audio Editing', I)],
    wanted: [skill('Data Analysis', B), skill('Python', B)],
  },
  {
    name: 'Rhea Fernandes', department: 'Communication',
    bio: 'MA Communication from Panaji, Goa. Graphic and UI designer. I can teach Figma and visual design; I want to build what I design.',
    offered: [skill('UI Design', A), skill('Figma', A), skill('Graphic Design', A), skill('Konkani', A)],
    wanted: [skill('React', B), skill('Python', B)],
  },
  {
    name: 'Sneha Patel', department: 'Management Studies',
    bio: 'MBA from Surat. Financial modelling and Excel are my thing. Garba on the side. I want to speak better in case interviews.',
    offered: [skill('Excel', A), skill('Financial Modelling', I), skill('Gujarati', A)],
    wanted: [skill('Public Speaking', I), skill('Python', B)],
  },
  {
    name: 'Divya Chaudhary', department: 'Dance',
    bio: 'MA Dance from Varanasi. Kathak for twelve years. I want to edit my own performance videos instead of waiting for friends.',
    offered: [skill('Kathak', A), skill('Choreography', I), skill('Yoga', I)],
    wanted: [skill('Video Editing', B), skill('Photography', B)],
  },
  {
    name: 'Tanmay Bhattacharya', department: 'Theatre Arts',
    bio: 'MA Theatre Arts from Durgapur. Actor and director. I teach voice and stage presence; I want to learn to shoot and edit short films.',
    offered: [skill('Acting', A), skill('Voice Modulation', A), skill('Bengali', A), skill('Public Speaking', A)],
    wanted: [skill('Photography', B), skill('Video Editing', B)],
  },
  {
    name: 'Kavya Jha', department: 'Painting',
    bio: 'MFA Painting from Madhubani, Bihar. Madhubani art runs in my family. I would like to learn design tools so my work reaches people online.',
    offered: [skill('Madhubani Painting', A), skill('Sketching', A), skill('Maithili', A)],
    wanted: [skill('Figma', B), skill('Photography', B)],
  },
  {
    name: 'Pooja Hegde', department: 'Linguistics',
    bio: 'MA Linguistics from Mangaluru. Kannada translator and language geek. I want to try NLP and get better at photography.',
    offered: [skill('Kannada', A), skill('Translation', I), skill('Linguistics', A)],
    wanted: [skill('Python', B), skill('Photography', B)],
  },
  {
    name: 'Devansh Malhotra', department: 'Philosophy',
    bio: 'MA Philosophy from Delhi. Logic, debating, and the same four guitar chords on repeat. Can teach all three; want to learn Python.',
    offered: [skill('Formal Logic', A), skill('Debating', A), skill('Guitar', I)],
    wanted: [skill('Python', B), skill('Chess', B)],
  },
  {
    name: 'Navya Sri Chowdary', department: 'English',
    bio: 'MA English from Vijayawada. I can teach Telugu, spoken English, rangoli and mehndi. Want to get comfortable with spreadsheets and coding.',
    offered: [skill('Telugu', A), skill('Spoken English', A), skill('Rangoli', A), skill('Mehndi', I)],
    wanted: [skill('Excel', B), skill('Python', B)],
  },
  {
    name: 'Abhishek Pandey', department: 'History',
    bio: 'PhD scholar from Prayagraj. Archival research, with UPSC history coaching on the side. Want to learn photography to document sources.',
    offered: [skill('Archival Research', A), skill('Hindi', A), skill('UPSC Preparation', A), skill('Essay Writing', A)],
    wanted: [skill('Photography', B), skill('Excel', B)],
  },
  {
    name: 'Sanjana Rao', department: 'Music',
    bio: 'MA Music from Dharwad. Hindustani classical vocals and harmonium. I record at home and need to learn audio editing.',
    offered: [skill('Hindustani Vocals', A), skill('Harmonium', A), skill('Kannada', A)],
    wanted: [skill('Audio Editing', B), skill('Public Speaking', B)],
  },
  {
    name: 'Meenakshi Iyer', department: 'Sanskrit',
    bio: 'MA Sanskrit from Thanjavur. Sanskrit grammar and Gita recitation. Curious about Sanskrit NLP, so I want to learn Python.',
    offered: [skill('Sanskrit', A), skill('Yoga', I), skill('Tamil', A)],
    wanted: [skill('Python', B), skill('Public Speaking', I)],
  },
];

// Instructor verification states, keyed by first name. Everyone else is a plain student.
const reviewed = (days) => new Date(Date.now() - days * 86_400_000);
const instructors = {
  Aarav: { status: 'verified', headline: 'Python and data structures tutor', experience: 'Teaching assistant for two programming courses; I have tutored 30+ juniors in Python and algorithms.' },
  Zoya: { status: 'verified', headline: 'Public speaking and creative writing coach', experience: 'Slam poetry performer and debate captain. I run a weekly speaking circle on campus.' },
  Rhea: { status: 'verified', headline: 'UI designer and Figma mentor', experience: 'Freelance UI designer for three startups. I teach Figma and visual design fundamentals.' },
  Kavya: { status: 'verified', headline: 'Madhubani painting artist', experience: 'Fourth-generation Madhubani artist with exhibitions in Patna and Delhi.' },
  Imran: { status: 'verified', headline: 'Video editing and podcasting', experience: 'Edit documentaries and run a campus podcast. Comfortable with Premiere and DaVinci Resolve.' },
  Tanmay: { status: 'pending', headline: 'Acting and voice modulation coach', experience: 'Ten years of stage experience; lead actor in four university productions and a trained voice coach.' },
  Fathima: { status: 'pending', headline: 'Lab techniques for biochemistry students', experience: 'Two years of hands-on PCR, ELISA and cell culture work; I have trained five junior researchers.' },
  Rohan: { status: 'rejected', headline: 'Organic chemistry tutor', experience: 'I enjoy organic chemistry.', reviewNote: 'Please add more detail about your teaching experience and reapply.' },
};

const admin = { name: 'Admin User', email: `admin@${EMAIL_DOMAIN}`, department: 'Administration', bio: 'Reviews instructor applications.' };

// [host, title, skill, description, minutes from now (or { days, hour }), duration, capacity, attendees, status]
const at = (days, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const classes = [
  ['Zoya', 'Public speaking for beginners', 'Public Speaking', 'Conquer stage fright with simple breathing, structure and delivery drills. Bring a 1-minute topic to practise.', 10, 60, 20, ['Aarav', 'Sneha', 'Mohammed', 'Vikram']], // opens right away
  ['Rhea', 'UI design basics with Figma', 'UI Design', 'Frames, auto layout and a simple design system. We will build a login screen together.', at(1, 18), 90, 15, ['Aarav', 'Arjun', 'Harini'], 'scheduled', 299], // paid: ₹299
  ['Aarav', 'Python from zero: variables to loops', 'Python', 'No experience needed. We cover variables, conditions and loops with small exercises.', at(2, 17), 60, 25, ['Joseph', 'Lakshmi', 'Sai', 'Ananya']],
  ['Kavya', 'Intro to Madhubani painting', 'Madhubani Painting', 'Learn the line work and motifs of Madhubani art. Paper and black ink are enough to start.', at(3, 16), 90, 3, ['Aarav', 'Divya', 'Priyanka']], // full
  ['Imran', 'Video editing in an hour', 'Video Editing', 'Cut, pace and export a short video. Any editor works; we will use free software.', at(4, 19), 60, 30, ['Zoya', 'Priyanka'], 'scheduled', 199], // paid: ₹199
  ['Aarav', 'Data structures crash course', 'Data Structures', 'Arrays, stacks, queues and the thinking behind them, with interview-style problems.', at(5, 18), 90, 20, []],
  ['Zoya', 'Slam poetry workshop', 'Creative Writing', 'Write and perform a short piece. Great for finding your voice.', at(-1, 17), 60, 15, ['Aarav', 'Ananya']], // already ended
  ['Imran', 'Podcasting basics', 'Podcasting', 'Mic setup, recording and editing for a first episode.', at(6, 17), 60, 20, ['Zoya'], 'cancelled'],
];

// Short department codes used to build a roll-number-style email, e.g. "25cs01@uohyd.ac.in".
const DEPT_CODES = {
  'Computer Science': 'cs',
  Physics: 'ph',
  Chemistry: 'chem',
  Biochemistry: 'bioc',
  'Animal Biology': 'zool',
  'Plant Sciences': 'bot',
  Psychology: 'psy',
  English: 'eng',
  Telugu: 'tel',
  Urdu: 'urdu',
  Economics: 'eco',
  'Political Science': 'pol',
  Sociology: 'soc',
  Anthropology: 'anth',
  Linguistics: 'ling',
  Mathematics: 'math',
  Statistics: 'stat',
  Communication: 'comm',
  'Management Studies': 'mba',
  Dance: 'dance',
  'Theatre Arts': 'thtr',
  Painting: 'paint',
  Philosophy: 'phil',
  History: 'hist',
  Music: 'music',
  Sanskrit: 'skt',
};

const firstName = (student) => student.name.split(' ')[0];

// One roll number per department, assigned in the order students appear above (cached by name so
// repeat calls for the same student return the same roll number).
const rollNumbers = new Map();
const serialByDept = new Map();
function rollNumberOf(student) {
  if (rollNumbers.has(student.name)) return rollNumbers.get(student.name);
  const code = DEPT_CODES[student.department];
  if (!code) throw new Error(`No roll-number code configured for department "${student.department}"`);
  const serial = (serialByDept.get(code) ?? 0) + 1;
  serialByDept.set(code, serial);
  const roll = `${ADMISSION_YEAR}${code}${String(serial).padStart(2, '0')}`;
  rollNumbers.set(student.name, roll);
  return roll;
}
const emailOf = (student) => `${rollNumberOf(student)}@${EMAIL_DOMAIN}`;

function checkSampleData() {
  const byFirstName = new Map();
  for (const s of students) {
    if (byFirstName.has(firstName(s))) throw new Error(`Duplicate first name in seed data: ${firstName(s)}`);
    byFirstName.set(firstName(s), s);
  }
  if (!students.some((s) => emailOf(s) === DEMO_EMAIL)) throw new Error('Demo user missing from seed data');
  for (const [host, title, , , , , capacity, attendees] of classes) {
    if (instructors[host]?.status !== 'verified') throw new Error(`Seed class "${title}" is hosted by ${host}, who is not a verified instructor`);
    for (const name of attendees) if (!byFirstName.has(name)) throw new Error(`Seed class "${title}" has an unknown attendee: ${name}`);
    if (attendees.length > capacity) throw new Error(`Seed class "${title}" has more attendees than its capacity`);
  }
  for (const name of Object.keys(instructors)) if (!byFirstName.has(name)) throw new Error(`Unknown instructor in seed data: ${name}`);
}

checkSampleData();
await connectDb();

if (config.nodeEnv === 'production') {
  console.error('Refusing to seed: NODE_ENV is "production" and seeding deletes all users and classes.');
  await mongoose.disconnect();
  process.exit(1);
}

await Promise.all([User.deleteMany({}), Session.deleteMany({}), Payment.deleteMany({})]);

const passwordHash = await bcrypt.hash(PASSWORD, 10);
const users = await User.insertMany([
  ...students.map(({ offered, wanted, ...s }) => {
    const first = s.name.split(' ')[0];
    const verification = instructors[first];
    return {
      ...s,
      email: emailOf(s),
      university: UNIVERSITY,
      passwordHash,
      skillsOffered: offered,
      skillsWanted: wanted,
      ...(verification && {
        instructor: {
          status: verification.status,
          headline: verification.headline,
          experience: verification.experience,
          appliedAt: reviewed(14),
          ...(verification.status !== 'pending' && { reviewedAt: reviewed(10), reviewNote: verification.reviewNote ?? '' }),
        },
      }),
    };
  }),
  { ...admin, university: UNIVERSITY, passwordHash, role: 'admin' },
]);
const byFirstName = Object.fromEntries(users.map((u) => [firstName(u), u]));

const minutes = (n) => new Date(Date.now() + n * 60_000);
const sessionDocs = classes.map(([host, title, skill, description, when, durationMinutes, capacity, attendees, status = 'scheduled', price = 0]) => {
  const startsAt = typeof when === 'number' ? minutes(when) : when;
  return {
    instructor: byFirstName[host]._id,
    title,
    skill,
    description,
    startsAt,
    durationMinutes,
    endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000),
    capacity,
    price, // most classes are free (price 0); a couple are seeded paid to demo that flow
    attendees: attendees.map((name) => byFirstName[name]._id),
    status,
    roomId: `skillswap-${crypto.randomBytes(12).toString('hex')}`,
  };
});
const insertedSessions = await Session.insertMany(sessionDocs);

// Give every existing attendee of a paid class a matching (mock) receipt, so the seeded data is
// consistent with what paying for real through the app would leave behind.
const seededPayments = insertedSessions.flatMap((s) => (s.price > 0 ? s.attendees.map((student) => ({ student, session: s._id, amount: s.price })) : []));
if (seededPayments.length > 0) await Payment.insertMany(seededPayments);

console.log(`Seeded ${users.length - 1} students, 1 admin, and ${sessionDocs.length} classes into ${mongoose.connection.name}.`);
console.log(`Log in as ${DEMO_EMAIL} (a verified instructor), admin@${EMAIL_DOMAIN} (admin), or any student, e.g. ${emailOf(byFirstName.Lakshmi)}. Password: "${PASSWORD}".`);
console.log("Class times are relative to now, so re-run the seed to refresh them.");
await mongoose.disconnect();
