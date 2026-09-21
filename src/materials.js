export const MATERIALS = [
  { id: 'moon-gold', name: 'Lucky moon', kind: 'moon', category: 'symbol', color: '#ffc638', accent: '#fff7b0', icon: '☾', shape: '50%' },
  { id: 'rose-prism', name: 'Rose prism', kind: 'rose', category: 'crystal', color: '#ff67ad', accent: '#ffd5e8', icon: '✦', shape: '35%' },
  { id: 'blue-eye', name: 'Blue eye', kind: 'eye', category: 'symbol', color: '#126cf1', accent: '#eefaff', icon: '◉', shape: '50%' },
  { id: 'amber-cube', name: 'Amber cube', kind: 'amber', category: 'crystal', color: '#ff8418', accent: '#ffe09a', icon: '◆', shape: '28%' },
  { id: 'daisy', name: 'Daisy', kind: 'flower', category: 'symbol', color: '#4aaeff', accent: '#ffffff', icon: '✿', shape: '50%' },
  { id: 'cobalt-gem', name: 'Cobalt gem', kind: 'blue', category: 'crystal', color: '#155eff', accent: '#bce8ff', icon: '✦', shape: '32%' },
  { id: 'coral-shell', name: 'Pearl shell', kind: 'shell', category: 'symbol', color: '#eed9b6', accent: '#fff9ea', icon: '◒', shape: '48% 48% 38% 38%' },
  { id: 'jade-ring', name: 'Jade ring', kind: 'jade', category: 'color', color: '#18b783', accent: '#baffdf', icon: '○', shape: '50%' },
  { id: 'pink-dice', name: 'Pink dice', kind: 'dice', category: 'symbol', color: '#ff79b7', accent: '#ffe0ee', icon: '∷', shape: '27%' },
  { id: 'cherries', name: 'Cherries', kind: 'cherry', category: 'symbol', color: '#e91f39', accent: '#ff9b9b', icon: '●●', shape: '50%' },
  { id: 'lilac-heart', name: 'Lilac heart', kind: 'lavender', category: 'color', color: '#956bff', accent: '#e9ddff', icon: '♥', shape: '48% 48% 52% 52%' },
  { id: 'pearl', name: 'Cloud pearl', kind: 'pearl', category: 'crystal', color: '#fff8ec', accent: '#ffffff', icon: '•', shape: '50%' },
  { id: 'coral-knot', name: 'Coral knot', kind: 'coral', category: 'color', color: '#ff5b51', accent: '#ffc0a9', icon: '∞', shape: '50%' },
  { id: 'aqua-drop', name: 'Aqua drop', kind: 'aqua', category: 'crystal', color: '#38cff7', accent: '#d9fbff', icon: '◇', shape: '48% 48% 55% 55%' },
  { id: 'tiny-bell', name: 'Tiny bell', kind: 'bell', category: 'symbol', color: '#ffc22e', accent: '#fff0a2', icon: '♢', shape: '42% 42% 50% 50%' },
  { id: 'lime-gem', name: 'Lime gem', kind: 'lime', category: 'color', color: '#bde82d', accent: '#f4ffb6', icon: '◆', shape: '30%' },
  { id: 'violet-candy', name: 'Violet candy', kind: 'candy', category: 'symbol', color: '#8b68ff', accent: '#eedfff', icon: '◆', shape: '50%' },
  { id: 'blue-star', name: 'Blue star', kind: 'star', category: 'symbol', color: '#155dff', accent: '#bdeaff', icon: '★', shape: '38%' },
  { id: 'sun-bow', name: 'Sun bow', kind: 'bow', category: 'symbol', color: '#ffc72d', accent: '#fff2aa', icon: '⋈', shape: '38%' },
  { id: 'clear-quartz', name: 'Clear quartz', kind: 'crystal', category: 'crystal', color: '#bfefff', accent: '#ffffff', icon: '✧', shape: '30%' },
  { id: 'ice-cube', name: 'Ice cube', kind: 'cube', category: 'crystal', color: '#8ddfff', accent: '#ffffff', icon: '□', shape: '28%' },
  { id: 'aqua-heart', name: 'Aqua heart', kind: 'heart', category: 'color', color: '#43d9f5', accent: '#d7ffff', icon: '♥', shape: '48% 48% 52% 52%' },
  { id: 'cobalt-orb', name: 'Cobalt orb', kind: 'cobalt', category: 'color', color: '#173fe7', accent: '#90b7ff', icon: '●', shape: '50%' },
  { id: 'sun-orb', name: 'Sun orb', kind: 'sun', category: 'color', color: '#ffd028', accent: '#fff9ae', icon: '☀', shape: '50%' },
  { id: 'sea-star', name: 'Sea-glass star', kind: 'star', category: 'symbol', color: '#6ec8b2', accent: '#d4fff0', icon: '★', shape: '38%', reward: 'ocean' },
  { id: 'rose-heart', name: 'Rose-glass heart', kind: 'heart', category: 'color', color: '#e987b4', accent: '#ffe4ef', icon: '♥', shape: '48%', reward: 'rose' },
  { id: 'garden-jade', name: 'Dewdrop jade', kind: 'jade', category: 'color', color: '#8dcc88', accent: '#e1ffd9', icon: '○', shape: '50%', reward: 'garden' },
  { id: 'moon-pearl', name: 'Moonlit pearl', kind: 'pearl', category: 'crystal', color: '#bbb9ed', accent: '#f1eeff', icon: '•', shape: '50%', reward: 'twins' },
  { id: 'sunset-crystal', name: 'Sunset crystal', kind: 'crystal', category: 'crystal', color: '#eeb578', accent: '#fff0cc', icon: '✧', shape: '30%', reward: 'festival' },
];

export const materialById = new Map(MATERIALS.map((item) => [item.id, item]));

const families = {
  blue: ['blue-eye', 'daisy', 'cobalt-gem', 'aqua-drop', 'blue-star', 'ice-cube', 'aqua-heart', 'cobalt-orb'],
  pink: ['rose-prism', 'pink-dice', 'rose-heart'], green: ['jade-ring', 'lime-gem', 'sea-star', 'garden-jade'],
  purple: ['lilac-heart', 'violet-candy', 'moon-pearl'], yellow: ['moon-gold', 'tiny-bell', 'sun-bow', 'sun-orb'],
  orange: ['amber-cube', 'sunset-crystal'], red: ['cherries', 'coral-knot'], neutral: ['coral-shell', 'pearl', 'clear-quartz'],
};
export function colorFamily(id) { return Object.entries(families).find(([, ids]) => ids.includes(id))?.[0]; }
