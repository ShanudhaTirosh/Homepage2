import { addLink, addCategory } from '../../firebase/firestore';

const DEFAULT_CATEGORIES = [
  { name: '🚀 Development', emoji: '💻', links: [
    { title: 'GitHub', url: 'https://github.com' },
    { title: 'ChatGPT', url: 'https://chatgpt.com' },
    { title: 'Stack Overflow', url: 'https://stackoverflow.com' },
    { title: 'Vercel', url: 'https://vercel.com' }
  ]},
  { name: '📚 Documentation', emoji: '📖', links: [
    { title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
    { title: 'React Docs', url: 'https://react.dev' },
    { title: 'Tailwind CSS', url: 'https://tailwindcss.com' },
    { title: 'Firebase Docs', url: 'https://firebase.google.com/docs' }
  ]},
  { name: '🛠️ Tools', emoji: '🔧', links: [
    { title: 'Can I Use', url: 'https://caniuse.com' },
    { title: 'TinyPNG', url: 'https://tinypng.com' },
    { title: 'Fonts', url: 'https://fonts.google.com' },
    { title: 'Icons', url: 'https://lucide.dev' }
  ]}
];

/**
 * Populates the user's dashboard with default developer links
 */
export async function seedUserDashboard(uid) {
  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const cat = DEFAULT_CATEGORIES[i];
    // 1. Create the category
    const catRef = await addCategory(uid, {
      name: cat.name,
      emoji: cat.emoji,
      order: i
    });

    // 2. Add links to that category
    for (let j = 0; j < cat.links.length; j++) {
      const link = cat.links[j];
      await addLink(uid, {
        ...link,
        categoryId: catRef.id,
        order: j,
        iconName: 'auto'
      });
    }
  }
}
