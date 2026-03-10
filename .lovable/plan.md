

## Redesign the Onboarding Screen

The current page is a plain centered card with flat text, no visual depth, and cramped spacing. Here's the plan for a polished, modern landing page:

### Visual Improvements

**Background & atmosphere**
- Add a subtle radial gradient glow behind the hero area (emerald-tinted, very faint) using a pseudo-element or absolute div
- Add a very subtle grid/dot pattern overlay on the background for texture

**Logo/Icon area**
- Add a soft animated glow ring around the shield icon (using box-shadow with the primary color)
- Increase spacing around it

**Typography & hierarchy**
- Make the title larger (text-5xl) with better letter-spacing
- Restyle the subtitle: separate the tagline from the "No passwords..." line with more breathing room, use a slightly brighter muted color

**CTA button**
- Add a subtle glow/shadow effect on the primary button (`shadow-lg shadow-primary/25`)
- Add a pulsing dot or shimmer animation when idle to draw attention

**Feature pills (Encrypted Vault / No Backend / Disposable)**
- Restyle from plain text to subtle card-like pills with `bg-card border border-border rounded-lg p-3` for more visual weight and separation
- Add small icons (Lock, Cloud, Timer) to each feature

**Info section**
- Keep as-is (collapsible works well)

**GitHub footer**
- Keep current subtle positioning

**Overall spacing**
- Increase `space-y-8` to `space-y-10` for more breathing room
- Add `max-w-lg` instead of `max-w-md` for a slightly wider container

### Single file change
- `src/components/OnboardingScreen.tsx` -- full restyle of the component JSX and classes

