/**
 * The wisdom library: lines from self-help books, ML engineering practice and
 * Islamic reminders, each tagged with the pillars it speaks to. The Now screen
 * picks one that fits the current block and rotates it every 20 minutes.
 */
import type { Category } from '../schedule/types';
import type { Pillar } from '../game/types';

export type WisdomKind = 'book' | 'ml' | 'deen' | 'stoic';

export interface Wisdom {
  text: string;
  /** Person, or the practice for unattributed tips. */
  by: string;
  /** Book, surah:ayah, hadith collection or essay. */
  source?: string;
  kind: WisdomKind;
  pillars: Pillar[];
}

export const KIND_LABEL: Record<WisdomKind, string> = {
  book: 'Library',
  ml: 'Engineering',
  deen: 'Reminder',
  stoic: 'Stoa',
};

export const WISDOM: Wisdom[] = [
  // ── Systems & habits ─────────────────────────────────────────────
  { kind: 'book', by: 'James Clear', source: 'Atomic Habits', pillars: ['craft', 'body', 'wealth'], text: 'You do not rise to the level of your goals. You fall to the level of your systems.' },
  { kind: 'book', by: 'James Clear', source: 'Atomic Habits', pillars: ['craft', 'deen', 'body', 'wealth', 'love'], text: 'Every action you take is a vote for the type of person you wish to become.' },
  { kind: 'book', by: 'James Clear', source: 'Atomic Habits', pillars: ['craft', 'wealth'], text: 'Habits are the compound interest of self-improvement.' },
  { kind: 'book', by: 'James Clear', source: 'Atomic Habits', pillars: ['craft', 'body'], text: 'If you can get one percent better each day for one year, you’ll end up thirty-seven times better by the time you’re done.' },
  { kind: 'book', by: 'Cal Newport', source: 'Deep Work', pillars: ['craft'], text: 'Who you are, what you think, feel, and do, what you love — is the sum of what you focus on.' },
  { kind: 'book', by: 'Cal Newport', source: 'Deep Work', pillars: ['craft'], text: 'To produce at your peak level you need to work for extended periods with full concentration on a single task free from distraction.' },
  { kind: 'book', by: 'Steve Martin', source: 'quoted in So Good They Can’t Ignore You', pillars: ['craft', 'wealth'], text: 'Be so good they can’t ignore you.' },
  { kind: 'book', by: 'Greg McKeown', source: 'Essentialism', pillars: ['craft', 'love'], text: 'If you don’t prioritize your life, someone else will.' },
  { kind: 'book', by: 'Friedrich Nietzsche', source: 'quoted in Man’s Search for Meaning', pillars: ['deen', 'craft'], text: 'He who has a why to live for can bear almost any how.' },
  { kind: 'book', by: 'Carol Dweck', source: 'Mindset', pillars: ['craft', 'body'], text: 'Becoming is better than being.' },
  { kind: 'book', by: 'Tim Ferriss', pillars: ['wealth', 'craft'], text: 'What we fear doing most is usually what we most need to do.' },
  { kind: 'book', by: 'Jocko Willink', source: 'Discipline Equals Freedom', pillars: ['body', 'craft'], text: 'Discipline equals freedom.' },
  { kind: 'book', by: 'John Carmack', pillars: ['craft'], text: 'Focus is a matter of deciding what things you’re not going to do.' },
  { kind: 'book', by: 'Steve Jobs', source: 'Stanford, 2005', pillars: ['craft', 'wealth'], text: 'The only way to be truly satisfied is to do what you believe is great work.' },

  // ── Wealth ───────────────────────────────────────────────────────
  { kind: 'book', by: 'Naval Ravikant', pillars: ['wealth', 'love'], text: 'Play long-term games with long-term people. All returns in life come from compound interest.' },
  { kind: 'book', by: 'Naval Ravikant', pillars: ['wealth'], text: 'Seek wealth, not money or status. Wealth is having assets that earn while you sleep.' },
  { kind: 'book', by: 'Naval Ravikant', pillars: ['wealth', 'craft'], text: 'Learn to sell. Learn to build. If you can do both, you will be unstoppable.' },
  { kind: 'book', by: 'Morgan Housel', source: 'The Psychology of Money', pillars: ['wealth'], text: 'Doing well with money has a little to do with how smart you are and a lot to do with how you behave.' },
  { kind: 'book', by: 'Morgan Housel', source: 'The Psychology of Money', pillars: ['wealth'], text: 'Wealth is what you don’t see.' },
  { kind: 'book', by: 'Morgan Housel', source: 'The Psychology of Money', pillars: ['wealth', 'love'], text: 'The highest form of wealth is the ability to wake up every morning and say, “I can do whatever I want today.”' },

  // ── Body ─────────────────────────────────────────────────────────
  { kind: 'book', by: 'Matthew Walker', source: 'Why We Sleep', pillars: ['body'], text: 'Sleep is the single most effective thing we can do to reset our brain and body health each day.' },
  { kind: 'book', by: 'Navy SEAL maxim', pillars: ['body', 'craft'], text: 'Slow is smooth, and smooth is fast.' },

  // ── Love ─────────────────────────────────────────────────────────
  { kind: 'book', by: 'Robert Waldinger', source: 'Harvard Study of Adult Development', pillars: ['love', 'body'], text: 'Good relationships keep us happier and healthier. Period.' },

  // ── Stoa ─────────────────────────────────────────────────────────
  { kind: 'stoic', by: 'Marcus Aurelius', source: 'Meditations 5.20', pillars: ['craft', 'body'], text: 'The impediment to action advances action. What stands in the way becomes the way.' },
  { kind: 'stoic', by: 'Marcus Aurelius', source: 'Meditations 10.16', pillars: ['craft', 'love'], text: 'Waste no more time arguing about what a good man should be. Be one.' },
  { kind: 'stoic', by: 'Seneca', source: 'Letters to Lucilius, 13', pillars: ['body', 'deen'], text: 'We suffer more often in imagination than in reality.' },

  // ── ML / AI engineering ─────────────────────────────────────────
  { kind: 'ml', by: 'Andrej Karpathy', source: 'A Recipe for Training Neural Networks', pillars: ['craft'], text: 'Become one with the data. Spend hours scanning examples before you touch any model code.' },
  { kind: 'ml', by: 'Andrej Karpathy', source: 'A Recipe for Training Neural Networks', pillars: ['craft'], text: 'Neural net training fails silently.' },
  { kind: 'ml', by: 'Training recipe', pillars: ['craft'], text: 'Overfit a single batch first. If the loss won’t go to zero on 16 examples, you have a bug, not a model.' },
  { kind: 'ml', by: 'Training recipe', pillars: ['craft'], text: 'Check the loss at init: for a balanced k-way classifier it should be about ln(k). Anything else means a bug in your setup.' },
  { kind: 'ml', by: 'Rich Sutton', source: 'The Bitter Lesson', pillars: ['craft'], text: 'General methods that leverage computation are ultimately the most effective, and by a large margin.' },
  { kind: 'ml', by: 'George Box', pillars: ['craft'], text: 'All models are wrong, but some are useful.' },
  { kind: 'ml', by: 'Donald Knuth', pillars: ['craft'], text: 'Premature optimization is the root of all evil.' },
  { kind: 'ml', by: 'Kent Beck', pillars: ['craft'], text: 'Make it work, make it right, make it fast.' },
  { kind: 'ml', by: 'Alan Kay', pillars: ['craft', 'wealth'], text: 'The best way to predict the future is to invent it.' },
  { kind: 'ml', by: 'Eval-driven development', pillars: ['craft'], text: 'Evals over vibes. Build a 50-example golden set and run it on every prompt or model change.' },
  { kind: 'ml', by: 'Baselines', pillars: ['craft'], text: 'Start with a dumb baseline. Logistic regression has humbled a lot of transformers.' },
  { kind: 'ml', by: 'Experiment hygiene', pillars: ['craft'], text: 'Log the seed, config, git SHA and data version for every run. Future you is a different engineer.' },
  { kind: 'ml', by: 'Data leakage', pillars: ['craft'], text: 'Split by user, entity or time, never by row. Leakage is the bug that looks like a breakthrough.' },
  { kind: 'ml', by: 'Debugging', pillars: ['craft'], text: 'Plot the learning curves before you touch a hyperparameter. The curve usually tells you which one.' },
  { kind: 'ml', by: 'Shipping', pillars: ['craft', 'wealth'], text: 'Ship the boring version first, then iterate where the metrics hurt.' },
  { kind: 'ml', by: 'Error analysis', pillars: ['craft'], text: 'Read 100 failure cases and bucket them by hand. The biggest bucket is your next sprint.' },
  { kind: 'ml', by: 'RAG in practice', pillars: ['craft'], text: 'Most RAG failures are retrieval failures. Measure recall@k before you blame the LLM.' },
  { kind: 'ml', by: 'Research habit', pillars: ['craft'], text: 'Skim abstracts daily, read one paper deeply each week, reimplement one each month.' },
  { kind: 'ml', by: 'Research habit', pillars: ['craft'], text: 'Keep a research log: what you tried, what you expected, what happened. It becomes your paper’s method section.' },
  { kind: 'ml', by: 'Portfolio', pillars: ['craft', 'wealth'], text: 'One end-to-end project beats five notebooks: data, model, evals, deployment and a write-up people can read.' },
  { kind: 'ml', by: 'Job search', pillars: ['wealth'], text: 'Lead every CV bullet with impact and a number. Hiring managers skim for proof, not for tools.' },
  { kind: 'ml', by: 'Supervisor outreach', pillars: ['wealth', 'craft'], text: 'Cite one of their papers you actually read, and pitch one concrete idea that extends it. Short beats complete.' },
  { kind: 'ml', by: 'Research degrees', pillars: ['wealth', 'craft'], text: 'For a Master’s by Research, the supervisor is the application. Secure their backing before the scholarship round closes.' },

  // ── Qur’an ───────────────────────────────────────────────────────
  { kind: 'deen', by: 'Qur’an', source: 'Ash-Sharh 94:6', pillars: ['deen', 'body', 'wealth'], text: 'Indeed, with hardship comes ease.' },
  { kind: 'deen', by: 'Qur’an', source: 'Al-Baqarah 2:286', pillars: ['deen', 'body'], text: 'Allah does not burden a soul beyond that it can bear.' },
  { kind: 'deen', by: 'Qur’an', source: 'Ar-Ra‘d 13:28', pillars: ['deen'], text: 'Verily, in the remembrance of Allah do hearts find rest.' },
  { kind: 'deen', by: 'Qur’an', source: 'At-Talaq 65:3', pillars: ['deen', 'wealth'], text: 'And whoever relies upon Allah — then He is sufficient for him.' },
  { kind: 'deen', by: 'Qur’an', source: 'At-Talaq 65:2–3', pillars: ['deen', 'wealth'], text: 'Whoever is mindful of Allah, He will make a way out for him and provide for him from where he does not expect.' },
  { kind: 'deen', by: 'Qur’an', source: 'An-Najm 53:39', pillars: ['deen', 'craft', 'wealth'], text: 'And that there is not for man except that for which he strives.' },
  { kind: 'deen', by: 'Qur’an', source: 'Al-Baqarah 2:45', pillars: ['deen'], text: 'And seek help through patience and prayer.' },
  { kind: 'deen', by: 'Qur’an', source: 'Al-‘Ankabut 29:69', pillars: ['deen', 'craft'], text: 'And those who strive for Us — We will surely guide them to Our ways.' },
  { kind: 'deen', by: 'Qur’an', source: 'Ta-Ha 20:114', pillars: ['deen', 'craft'], text: 'My Lord, increase me in knowledge.' },
  { kind: 'deen', by: 'Qur’an', source: 'Al-Baqarah 2:152', pillars: ['deen'], text: 'So remember Me; I will remember you.' },
  { kind: 'deen', by: 'Qur’an', source: 'Ar-Ra‘d 13:11', pillars: ['deen', 'craft', 'body'], text: 'Allah will not change the condition of a people until they change what is in themselves.' },
  { kind: 'deen', by: 'Qur’an', source: 'Ibrahim 14:7', pillars: ['deen', 'wealth'], text: 'If you are grateful, I will surely increase you.' },
  { kind: 'deen', by: 'Qur’an', source: 'Al-Isra 17:24', pillars: ['love', 'deen'], text: 'My Lord, have mercy upon them as they brought me up when I was small.' },
  { kind: 'deen', by: 'Qur’an', source: 'Ar-Rum 30:21', pillars: ['love'], text: 'He placed between you affection and mercy. Indeed in that are signs for a people who give thought.' },

  // ── Hadith ───────────────────────────────────────────────────────
  { kind: 'deen', by: 'Prophet Muhammad ﷺ', source: 'Bukhari & Muslim', pillars: ['deen', 'craft', 'body'], text: 'The most beloved deeds to Allah are those done consistently, even if they are small.' },
  { kind: 'deen', by: 'Prophet Muhammad ﷺ', source: 'Sahih Muslim', pillars: ['body', 'deen'], text: 'The strong believer is better and more beloved to Allah than the weak believer, while there is good in both.' },
  { kind: 'deen', by: 'Prophet Muhammad ﷺ', source: 'al-Hakim', pillars: ['body', 'wealth', 'deen'], text: 'Take advantage of five before five: your youth before old age, health before sickness, wealth before poverty, free time before busyness, and life before death.' },
  { kind: 'deen', by: 'Prophet Muhammad ﷺ', source: 'Tirmidhi', pillars: ['love'], text: 'The best of you are those who are best to their families.' },
  { kind: 'deen', by: 'Prophet Muhammad ﷺ', source: 'Bukhari & Muslim', pillars: ['love', 'deen'], text: 'None of you truly believes until he loves for his brother what he loves for himself.' },
  { kind: 'deen', by: 'Prophet Muhammad ﷺ', source: 'Tirmidhi', pillars: ['love'], text: 'Your smile in the face of your brother is charity.' },
  { kind: 'deen', by: 'Prophet Muhammad ﷺ', source: 'Musnad Ahmad', pillars: ['craft', 'deen'], text: 'If the Hour is established and one of you has a sapling in his hand, let him plant it.' },
  { kind: 'deen', by: 'Prophet Muhammad ﷺ', source: 'al-Bayhaqi', pillars: ['craft', 'wealth'], text: 'Allah loves that when one of you does a job, he does it with excellence.' },
  { kind: 'deen', by: 'Prophet Muhammad ﷺ', source: 'Sahih Muslim', pillars: ['craft', 'deen'], text: 'Whoever takes a path seeking knowledge, Allah makes easy for him a path to Paradise.' },
  { kind: 'deen', by: 'Prophet Muhammad ﷺ', source: 'Sahih al-Bukhari', pillars: ['body'], text: 'Your body has a right over you.' },
  { kind: 'deen', by: 'Prophet Muhammad ﷺ', source: 'Tirmidhi', pillars: ['wealth', 'deen'], text: 'Tie your camel, then put your trust in Allah.' },
  { kind: 'deen', by: 'Prophet Muhammad ﷺ', source: 'Bukhari & Muslim', pillars: ['wealth', 'deen'], text: 'Richness is not having many possessions. True richness is the richness of the soul.' },
  { kind: 'deen', by: 'Prophet Muhammad ﷺ', source: 'Abu Dawud & Tirmidhi', pillars: ['craft', 'deen'], text: 'O Allah, bless my nation in its early mornings.' },
  { kind: 'deen', by: 'Imam al-Shafi‘i', pillars: ['craft', 'deen'], text: 'Knowledge is not what is memorised. Knowledge is what benefits.' },
];

/** The pillars a block's category draws its wisdom from, most relevant first. */
const POOLS: Record<Category, { pillars: Pillar[]; kinds?: WisdomKind[] }> = {
  prayer: { pillars: ['deen'], kinds: ['deen'] },
  deep_work: { pillars: ['craft'], kinds: ['ml', 'book', 'deen'] },
  research: { pillars: ['craft'], kinds: ['ml', 'deen'] },
  career_jobs: { pillars: ['wealth'] },
  career_scholarship: { pillars: ['wealth', 'craft'] },
  exercise: { pillars: ['body'] },
  wind_down: { pillars: ['body', 'deen'] },
  review: { pillars: ['craft', 'love'], kinds: ['stoic', 'book', 'deen'] },
  meal: { pillars: ['love', 'wealth', 'body'] },
  rest: { pillars: ['deen', 'love', 'body'] },
};

export function poolFor(category: Category): Wisdom[] {
  const { pillars, kinds } = POOLS[category];
  const pool = WISDOM.filter((w) => w.pillars.some((p) => pillars.includes(p)) && (!kinds || kinds.includes(w.kind)));
  return pool.length ? pool : WISDOM;
}

/** Small integer hash so the same bucket always shows the same line. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const WISDOM_ROTATE_MS = 20 * 60_000;

/** Deterministic pick: same block, same 20-minute window and same shuffle count → same line. */
export function pickWisdom(category: Category, now: number, shuffle = 0): Wisdom {
  const pool = poolFor(category);
  const bucket = Math.floor(now / WISDOM_ROTATE_MS);
  return pool[(hash(`${category}:${bucket}`) + shuffle) % pool.length]!;
}
