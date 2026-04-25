import { addLink, addCategory } from '../firebase/firestore';

const DEFAULT_CATEGORIES = [
  { name: '🚀 Development', emoji: '💻', links: [
    { title: 'GitHub', url: 'https://github.com' },
    { title: 'GitLab', url: 'https://gitlab.com' },
    { title: 'Bitbucket', url: 'https://bitbucket.org' },
    { title: 'Stack Overflow', url: 'https://stackoverflow.com' },
    { title: 'Vercel', url: 'https://vercel.com' },
    { title: 'Netlify', url: 'https://netlify.com' },
    { title: 'Railway', url: 'https://railway.app' },
    { title: 'Render', url: 'https://render.com' },
    { title: 'Fly.io', url: 'https://fly.io' },
    { title: 'Supabase', url: 'https://supabase.com' },
    { title: 'PlanetScale', url: 'https://planetscale.com' },
    { title: 'Neon DB', url: 'https://neon.tech' },
    { title: 'Firebase Console', url: 'https://console.firebase.google.com' },
    { title: 'MongoDB Atlas', url: 'https://cloud.mongodb.com' },
    { title: 'CodeSandbox', url: 'https://codesandbox.io' },
    { title: 'StackBlitz', url: 'https://stackblitz.com' },
    { title: 'Replit', url: 'https://replit.com' },
    { title: 'JSFiddle', url: 'https://jsfiddle.net' },
    { title: 'CodePen', url: 'https://codepen.io' },
    { title: 'Expo (React Native)', url: 'https://expo.dev' },
  ]},

  { name: '🤖 AI Platforms', emoji: '🧠', links: [
    { title: 'Claude', url: 'https://claude.ai' },
    { title: 'ChatGPT', url: 'https://chatgpt.com' },
    { title: 'Gemini', url: 'https://gemini.google.com' },
    { title: 'Perplexity', url: 'https://perplexity.ai' },
    { title: 'Microsoft Copilot', url: 'https://copilot.microsoft.com' },
    { title: 'Grok', url: 'https://grok.com' },
    { title: 'Hugging Face', url: 'https://huggingface.co' },
    { title: 'v0 by Vercel', url: 'https://v0.dev' },
    { title: 'Bolt.new', url: 'https://bolt.new' },
    { title: 'Lovable', url: 'https://lovable.dev' },
    { title: 'Cursor', url: 'https://cursor.com' },
    { title: 'Windsurf', url: 'https://windsurf.com' },
    { title: 'DeepSeek', url: 'https://chat.deepseek.com' },
    { title: 'Mistral', url: 'https://chat.mistral.ai' },
    { title: 'Together AI', url: 'https://together.ai' },
    { title: 'Replicate', url: 'https://replicate.com' },
    { title: 'OpenRouter', url: 'https://openrouter.ai' },
    { title: 'Poe', url: 'https://poe.com' },
    { title: 'Phind', url: 'https://phind.com' },
    { title: 'You.com', url: 'https://you.com' },
  ]},

  { name: '🎨 AI Image & Creative', emoji: '🖼️', links: [
    { title: 'Midjourney', url: 'https://midjourney.com' },
    { title: 'DALL·E (ChatGPT)', url: 'https://chatgpt.com' },
    { title: 'Leonardo AI', url: 'https://leonardo.ai' },
    { title: 'Stable Diffusion (DreamStudio)', url: 'https://dreamstudio.ai' },
    { title: 'Adobe Firefly', url: 'https://firefly.adobe.com' },
    { title: 'Kling AI', url: 'https://klingai.com' },
    { title: 'Runway ML', url: 'https://runwayml.com' },
    { title: 'Suno (AI Music)', url: 'https://suno.com' },
    { title: 'ElevenLabs (Voice)', url: 'https://elevenlabs.io' },
    { title: 'Canva AI', url: 'https://canva.com' },
  ]},

  { name: '📚 Documentation', emoji: '📖', links: [
    { title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
    { title: 'React Docs', url: 'https://react.dev' },
    { title: 'Next.js Docs', url: 'https://nextjs.org/docs' },
    { title: 'Vue Docs', url: 'https://vuejs.org' },
    { title: 'Tailwind CSS', url: 'https://tailwindcss.com' },
    { title: 'Firebase Docs', url: 'https://firebase.google.com/docs' },
    { title: 'Node.js Docs', url: 'https://nodejs.org/en/docs' },
    { title: 'TypeScript Docs', url: 'https://typescriptlang.org/docs' },
    { title: 'Vite Docs', url: 'https://vitejs.dev' },
    { title: 'Prisma Docs', url: 'https://prisma.io/docs' },
    { title: 'Express Docs', url: 'https://expressjs.com' },
    { title: 'FastAPI Docs', url: 'https://fastapi.tiangolo.com' },
    { title: 'Python Docs', url: 'https://docs.python.org' },
    { title: 'Kotlin Docs', url: 'https://kotlinlang.org/docs' },
    { title: 'DevDocs', url: 'https://devdocs.io' },
    { title: 'W3Schools', url: 'https://w3schools.com' },
  ]},

  { name: '🛠️ Dev Tools', emoji: '🔧', links: [
    { title: 'Can I Use', url: 'https://caniuse.com' },
    { title: 'TinyPNG', url: 'https://tinypng.com' },
    { title: 'Squoosh (Image)', url: 'https://squoosh.app' },
    { title: 'Google Fonts', url: 'https://fonts.google.com' },
    { title: 'Lucide Icons', url: 'https://lucide.dev' },
    { title: 'SVG Repo', url: 'https://svgrepo.com' },
    { title: 'Iconify', url: 'https://iconify.design' },
    { title: 'Regex101', url: 'https://regex101.com' },
    { title: 'JSON Formatter', url: 'https://jsonformatter.curiousconcept.com' },
    { title: 'JSON Crack', url: 'https://jsoncrack.com' },
    { title: 'Hoppscotch (API)', url: 'https://hoppscotch.io' },
    { title: 'Postman', url: 'https://postman.com' },
    { title: 'Transform Tools', url: 'https://transform.tools' },
    { title: 'npm Trends', url: 'https://npmtrends.com' },
    { title: 'Bundlephobia', url: 'https://bundlephobia.com' },
    { title: 'Crontab Guru', url: 'https://crontab.guru' },
    { title: 'Base64 Decode', url: 'https://base64decode.org' },
    { title: 'JWT Debugger', url: 'https://jwt.io' },
    { title: 'WAVE (Accessibility)', url: 'https://wave.webaim.org' },
    { title: 'PageSpeed Insights', url: 'https://pagespeed.web.dev' },
  ]},

  { name: '🎨 Design', emoji: '🎨', links: [
    { title: 'Figma', url: 'https://figma.com' },
    { title: 'Penpot', url: 'https://penpot.app' },
    { title: 'Coolors', url: 'https://coolors.co' },
    { title: 'UI Colors', url: 'https://uicolors.app' },
    { title: 'Glassmorphism CSS', url: 'https://ui.glass/generator' },
    { title: 'CSS Gradient', url: 'https://cssgradient.io' },
    { title: 'Neumorphism', url: 'https://neumorphism.io' },
    { title: 'Shadcn UI', url: 'https://ui.shadcn.com' },
    { title: 'DaisyUI', url: 'https://daisyui.com' },
    { title: 'Aceternity UI', url: 'https://ui.aceternity.com' },
    { title: 'Magic UI', url: 'https://magicui.design' },
    { title: 'Unsplash', url: 'https://unsplash.com' },
    { title: 'Pexels', url: 'https://pexels.com' },
    { title: 'Lottie Files', url: 'https://lottiefiles.com' },
    { title: 'Spline 3D', url: 'https://spline.design' },
    { title: 'Dribbble', url: 'https://dribbble.com' },
    { title: 'Behance', url: 'https://behance.net' },
    { title: 'Mobbin (UI Ref)', url: 'https://mobbin.com' },
  ]},

  { name: '📬 Daily Apps', emoji: '📅', links: [
    { title: 'Gmail', url: 'https://mail.google.com' },
    { title: 'Google Calendar', url: 'https://calendar.google.com' },
    { title: 'Google Drive', url: 'https://drive.google.com' },
    { title: 'Google Meet', url: 'https://meet.google.com' },
    { title: 'Google Translate', url: 'https://translate.google.com' },
    { title: 'Google Maps', url: 'https://maps.google.com' },
    { title: 'Notion', url: 'https://notion.so' },
    { title: 'Trello', url: 'https://trello.com' },
    { title: 'Linear', url: 'https://linear.app' },
    { title: 'Jira', url: 'https://atlassian.com/software/jira' },
    { title: 'Slack', url: 'https://slack.com' },
    { title: 'Discord', url: 'https://discord.com' },
    { title: 'WhatsApp Web', url: 'https://web.whatsapp.com' },
    { title: 'Telegram Web', url: 'https://web.telegram.org' },
    { title: 'YouTube', url: 'https://youtube.com' },
    { title: 'Reddit', url: 'https://reddit.com' },
    { title: 'X (Twitter)', url: 'https://x.com' },
    { title: 'LinkedIn', url: 'https://linkedin.com' },
  ]},

  { name: '☁️ Cloud & DevOps', emoji: '☁️', links: [
    { title: 'AWS Console', url: 'https://console.aws.amazon.com' },
    { title: 'Google Cloud', url: 'https://console.cloud.google.com' },
    { title: 'Azure Portal', url: 'https://portal.azure.com' },
    { title: 'Cloudflare', url: 'https://dash.cloudflare.com' },
    { title: 'Docker Hub', url: 'https://hub.docker.com' },
    { title: 'GitHub Actions', url: 'https://github.com/features/actions' },
    { title: 'CircleCI', url: 'https://circleci.com' },
    { title: 'Sentry (Error Tracking)', url: 'https://sentry.io' },
    { title: 'Uptime Robot', url: 'https://uptimerobot.com' },
    { title: 'BetterStack', url: 'https://betterstack.com' },
    { title: 'Grafana', url: 'https://grafana.com' },
    { title: 'ngrok', url: 'https://ngrok.com' },
  ]},

  { name: '📦 Package Registries', emoji: '📦', links: [
    { title: 'npm', url: 'https://npmjs.com' },
    { title: 'PyPI', url: 'https://pypi.org' },
    { title: 'Maven Repository', url: 'https://mvnrepository.com' },
    { title: 'pub.dev (Flutter)', url: 'https://pub.dev' },
    { title: 'crates.io (Rust)', url: 'https://crates.io' },
    { title: 'Packagist (PHP)', url: 'https://packagist.org' },
  ]},

  { name: '🧪 Testing & QA', emoji: '🧪', links: [
    { title: 'Playwright', url: 'https://playwright.dev' },
    { title: 'Cypress', url: 'https://cypress.io' },
    { title: 'Vitest', url: 'https://vitest.dev' },
    { title: 'Jest', url: 'https://jestjs.io' },
    { title: 'Testing Library', url: 'https://testing-library.com' },
    { title: 'BrowserStack', url: 'https://browserstack.com' },
  ]},

  { name: '📖 Learning', emoji: '🎓', links: [
    { title: 'freeCodeCamp', url: 'https://freecodecamp.org' },
    { title: 'The Odin Project', url: 'https://theodinproject.com' },
    { title: 'Frontend Mentor', url: 'https://frontendmentor.io' },
    { title: 'LeetCode', url: 'https://leetcode.com' },
    { title: 'HackerRank', url: 'https://hackerrank.com' },
    { title: 'Roadmap.sh', url: 'https://roadmap.sh' },
    { title: 'CS50 (Harvard)', url: 'https://cs50.harvard.edu' },
    { title: 'Coursera', url: 'https://coursera.org' },
    { title: 'Udemy', url: 'https://udemy.com' },
    { title: 'YouTube (Tech)', url: 'https://youtube.com/@Fireship' },
  ]},
];

/**
 * Populates the user's dashboard with default developer links
 */
export async function seedUserDashboard(uid) {
  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const cat = DEFAULT_CATEGORIES[i];
    const catRef = await addCategory(uid, {
      name: cat.name,
      emoji: cat.emoji,
      order: i
    });

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