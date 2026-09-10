import { z } from 'zod';
export const schemas = {
  pages: {
    product: z.object({
      "capabilities": z.array(z.object({
        "title": z.string(),
        "tag": z.string(),
        "desc": z.string(),
        "bullets": z.array(z.string()),
        "example": z.object({
          "prompt": z.string(),
          "output": z.string()
        }),
        "id": z.string()
      })),
      "howItWorks": z.array(z.object({
        "step": z.string(),
        "title": z.string(),
        "body": z.string(),
        "id": z.string()
      })),
      "stats": z.array(z.object({
        "value": z.string(),
        "label": z.string(),
        "mono": z.string(),
        "id": z.string()
      })),
      "useCases": z.array(z.object({
        "title": z.string(),
        "body": z.string(),
        "id": z.string()
      }))
    }),
    contact: z.object({
      "contactReasons": z.array(z.string())
    }),
    pricing: z.object({
      "topUpPacks": z.array(z.object({
        "hours": z.number(),
        "price": z.number(),
        "label": z.string(),
        "note": z.string(),
        "popular": z.boolean(),
        "id": z.string()
      })),
      "complexityExamples": z.array(z.object({
        "tier": z.string(),
        "examples": z.array(z.string()),
        "id": z.string()
      })),
      "faqs": z.array(z.object({
        "q": z.string(),
        "a": z.string(),
        "id": z.string()
      }))
    }),
    enterprise: z.object({
      "SEAT_TIERS": z.array(z.object({
        "range": z.string(),
        "price": z.string(),
        "period": z.string(),
        "highlight": z.boolean(),
        "id": z.string()
      })),
      "CAPABILITIES": z.array(z.object({
        "title": z.string(),
        "sub": z.string(),
        "desc": z.string(),
        "id": z.string()
      })),
      "FAQS": z.array(z.object({
        "q": z.string(),
        "a": z.string(),
        "id": z.string()
      })),
      "LOGOS": z.array(z.string())
    }),
    security: z.object({
      "PILLARS": z.array(z.object({
        "title": z.string(),
        "body": z.string(),
        "id": z.string()
      }))
    }),
    home: z.object({
      "hero": z.object({
        "badge": z.string(),
        "headline1": z.string(),
        "headline2": z.string(),
        "body": z.string(),
        "cta_primary": z.string(),
        "cta_secondary": z.string(),
        "trust1": z.string(),
        "trust2": z.string(),
        "trust3": z.string()
      }),
      "terminal": z.object({
        "title": z.string(),
        "lines": z.array(z.object({
          "id": z.string(),
          "prefix": z.string(),
          "text": z.string(),
          "type": z.string()
        }))
      }),
      "outputs_section": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "body": z.string()
      }),
      "engine_section": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "body": z.string(),
        "docs_link": z.string()
      }),
      "bcu_section": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "body": z.string(),
        "meter_note": z.string()
      }),
      "audience_section": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "body": z.string()
      }),
      "ownership_section": z.object({
        "eyebrow": z.string(),
        "heading": z.string(),
        "body": z.string()
      }),
      "cta_section": z.object({
        "heading": z.string(),
        "body": z.string(),
        "cta_primary": z.string(),
        "cta_secondary": z.string()
      })
    })
  }
};
export type Schemas = typeof schemas;