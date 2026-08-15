# Camera path families

One family per pair of files. The `.md` is the brief we age. The `.ts` is the sampler the runner plays.

Lab buttons, when added, target the **id** column. They must not load these markdown files.

## Live

| Id | Brief | Sampler | Auto-select |
| --- | --- | --- | --- |
| `local-glide` | [local-glide.md](./local-glide.md) | `local-glide.ts` | &lt; 3 km |
| `orbit-reveal` | [orbit-reveal.md](./orbit-reveal.md) | `orbit-reveal.ts` | 3–500 km |
| `departure-arrival-arc` | [departure-arrival-arc.md](./departure-arrival-arc.md) | `departure-arrival-arc.ts` | ≥ 500 km |

## Planned signposts

No id. No sampler. No auto-select.

| Name | Brief | Closest live family |
| --- | --- | --- |
| linear | [linear.md](./linear.md) | `local-glide` |
| high-arc | [high-arc.md](./high-arc.md) | `departure-arrival-arc` |
| low-arc | [low-arc.md](./low-arc.md) | `departure-arrival-arc` |
| route | [route.md](./route.md) | `orbit-reveal` |

Governing model: [`../CAMERA-SYSTEM.md`](../CAMERA-SYSTEM.md).
