# ProxySpeak UI and Experience Direction

This document records the agreed visual and interaction direction for the ProxySpeak product.

## 1. Product identity

ProxySpeak is a proximity-based voice collaboration environment. It should feel like:

> **Corporate collaboration + virtual world + subtle game mechanics**

The interface should be professional enough for meetings and work while making presence, proximity, movement, and social interaction feel tangible.

The product should be **gamified, not presented as a conventional video game**.

Avoid a generic AI-dashboard aesthetic, excessive neon effects, or decorative animation that does not communicate product behavior.

## 2. Product experiences

ProxySpeak is intentionally split into two experiences.

### Landing page

The landing page is the public product introduction.

Its purpose is to explain the core idea quickly:

1. Move closer to someone.
2. Enter their proximity range.
3. Hear/talk to nearby people.
4. Walk away and the audio relationship fades.

The landing page should be highly polished and interactive, but should remain focused on explaining the product.

Planned structure:

- Hero
- How ProxySpeak works
- Proximity voice demonstration
- Virtual office/product showcase
- Feature overview
- Final call to action
- Entry into the application

### Application

The application is the actual shared virtual environment.

Its visual direction is a professional virtual office with game-like interaction cues:

- People rather than generic 'players'
- Office/meeting/lounging spaces
- Proximity indicators
- Speaking indicators
- Presence states
- Room occupancy
- Movement controls
- Map/navigation
- Subtle badges or achievements where they add value

Development/debug labels such as 'Mock', 'Simulate Permission', or 'Visual Only' may be used during implementation, but they are not intended to remain in the finished product UI.

## 3. Visual language

The visual system should be built around a dark corporate foundation with strong red branding and restrained supporting colors.

### Core palette

| Role | Direction |
| --- | --- |
| Background | Near-black |
| Surface | Very dark charcoal |
| Primary text | Warm white |
| Secondary text | Cool/light gray |
| Brand/action | Vibrant red |
| Attention/proximity | Warm yellow |
| Connected/active | Green |
| Secondary accent | Orange |

Red is the primary brand and action color.

Yellow is primarily for proximity, attention, and interaction states.

Green communicates connected/active states.

Black and white provide the corporate foundation.

Purple is not a primary ProxySpeak brand color. Existing purple components should be recolored or restyled when they are incorporated into ProxySpeak.

## 4. Typography

The current design direction uses **Atkinson Hyperlegible** for both headings and body text.

The existing type scale is based on a 16px root size:

- sm: 0.750rem
- base: 1rem
- xl: 1.333rem
- 2xl: 1.777rem
- 3xl: 2.369rem
- 4xl: 3.158rem
- 5xl: 4.210rem

Weights:

- Normal: 400
- Bold: 700

Typography should remain readable and functional rather than decorative.

## 5. Animation and interaction principles

Animation should communicate hierarchy, state, navigation, and physical/social presence.

Avoid combining multiple animation systems simply for visual spectacle.

Preferred responsibilities:

- **Lenis** — smooth scrolling on the landing page.
- **Animate UI / Motion** — React UI transitions, interactive controls, component animations, and micro-interactions.
- **Canvas** — the actual virtual-world rendering.
- Additional animation tooling should only be introduced when a concrete interaction requires it.

Inspira UI is a source of design and interaction inspiration, but it is a Vue/Nuxt project and is not a direct dependency of the React/Vite ProxySpeak client.

The goal is a polished interface without 'AI slop': no unnecessary particles, glowing blobs, excessive gradients, cursor trails, or animation layers that compete with the product.

## 6. Component/library strategy

### Lenis

Use for the public landing page's scrolling experience.

### Animate UI

Use selectively for React components and motion patterns that fit the ProxySpeak design system.

Components should be adapted to ProxySpeak's visual language rather than copied with their original styling.

### Inspira UI

Use as a reference for interaction and visual ideas when useful.

Do not add the Vue/Nuxt library directly to the React/Vite client.

### Custom ProxySpeak components

The virtual-world UI remains custom and should be designed around the product's actual behavior.

This includes:

- World canvas
- People/presence indicators
- Proximity visualization
- Voice state controls
- World HUD
- Map/navigation
- Meeting/room interfaces

## 7. Responsive and accessibility direction

The landing page must work across desktop and mobile layouts.

The application should prioritize desktop interaction for the virtual world, while still providing sensible responsive behavior for supporting UI.

Interactive states must remain understandable without relying only on color or animation.

## 8. Scope boundary

This document defines the visual and UX direction. It does not change the real-time networking, movement, proximity, or WebRTC contracts.

Product behavior remains governed by contracts.md.

Future UI changes that introduce a new shared interaction or materially change product behavior should update contracts.md as well.

## 9. Landing page implementation direction

The landing page has been intentionally simplified into a normal-flow editorial product story.

The previous long cinematic sticky sections are not part of the current direction. They caused too much scroll overhead and made the page feel disconnected from the content.

The current experience should:

- establish the product promise immediately;
- explain the move → arrive → talk → leave interaction;
- include one meaningful interactive proximity demonstration;
- show the virtual workplace as a product surface rather than a decorative scene;
- explain the technical foundation without turning the page into a developer dashboard;
- end with a direct entry into /app.

Motion should be restrained and purposeful. Use Lenis for smooth scrolling, Motion for in-view reveals and micro-interactions, and normal document flow for section transitions. Long sticky viewport locks should not be introduced unless a concrete product interaction requires one.

The Proximity Lab is a visual simulation only until the actual proximity and WebRTC milestones are implemented.


## 10. Active workspace reference implementation

The supplied ProxySpeak workspace reference image is the visual target for the active world experience. It should guide composition, density, glassmorphism, avatar presentation, world architecture, floating labels, proximity visualization, and control placement.

The reference is not a requirement to render static people or inactive controls. Product behavior takes precedence: before entering a world, show Join a World; after entering, render only the current user and actual server-sourced members; expose controls only when their underlying behavior exists.

The interface should use translucent dark glass surfaces with adjustable transparency, visible world content beneath panels, restrained blur, compact borders, warm spatial lighting, and a soft-focus local avatar. The world itself should remain the primary visual surface rather than being hidden behind opaque UI.


## 11. Workspace refinement from supplied screenshots

The latest supplied screenshots are the active visual reference for the workspace.

### Spatial composition

- Keep the world visually dominant but contained enough that the viewer can understand where the environment ends.
- Avoid a full-viewport cropped world that makes the scene feel endless.
- Use a subtle perimeter/vignette rather than a thick hard boundary.
- Keep the world architecture calmer than the interface so the eye can identify the interactive layer.

### People

Stickman-style people are now the preferred avatar language. The figure should remain crisp at normal viewing size, with color rings and compact labels carrying state.

### Glass interaction

Panels should feel like transparent layers over the world rather than opaque cards pasted on top.

- Close floating panels when the user clicks outside.
- Clicking an active toolbar control toggles its panel closed.
- Responsive panels must reduce width and height as the viewport shrinks.
- Motion should be short, purposeful, and based on blur/fade/slide patterns.

### Reference libraries

Inspira UI provides Vue/Nuxt-first copyable components, so useful visual patterns are adapted into the React/Vite codebase rather than introducing Vue dependencies. Animate UI follows a copy-first React component model powered by Motion, so its effect patterns are suitable for local adaptation. The official docs describe its Effect primitive around blur, slide, fade, zoom, and in-view behavior. Lenis remains reserved for landing-page smooth scrolling rather than the spatial world itself.
