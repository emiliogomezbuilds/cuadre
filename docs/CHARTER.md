# CHARTER: Cuadre

Week 12 · The venture charter · **Emilio Gómez González** · Team 7 · written 1 November 2026, before the Week 12 rebuild starts.
Live at https://cuadre.dev. This charter is the referee for every scope fight of the next six weeks, including the ones with myself. Version 0.1; changes are logged at the bottom.

## VISION (the 3-year product)

In three years Cuadre is the Spanish-language evidence ledger that sits between a Mexican producer's suppliers and whatever packaging-reporting format the authority and any producer-responsibility organization finally require. A coordinator brings in the files her suppliers already send, Cuadre shows what changed since the last approved cycle, a person decides every difference and writes why, and what comes out is an evidence file in which every value carries its source, its status and its version. Cuadre never says more than the evidence says. If a global vendor such as Recyda or Specright enters Mexico, Cuadre's place is the Spanish-language intake and decision record in front of it, not a competing platform.

## USERS (who, exactly)

- **Primary: the packaging-data coordinator.** One person at a Mexican producer or importer, roughly 20 to 200 SKUs, who collects packaging data (material, weight, recycled-content claims, supporting documents) from suppliers as spreadsheets, emails and label photos, with no ERP or PLM integration. Persona: Karla, 34 (see `PERSONAS.md`).
- **Secondary: the reviewer.** The second person who approves a cycle and may be asked later who decided what. Persona: Mauricio, 46.
- **Not users in version 1:** suppliers, waste collectors or informal workers, regulators, consultants, investors. Cuadre holds no data about collectors or workers.

## PRINCIPLES (the product never breaks these)

1. **Evidence never becomes a claim.** A recycled-content value without an evidence reference is exported empty and marked "sin sustento". A reference is shown as "declarada por el proveedor, no verificada por Cuadre". No screen or file says "reciclado verificado".
2. **Nothing is overwritten.** A change creates a new version; old versions stay reachable. A removed row leaves a dated record, not a hole.
3. **A person decides, with a reason, and there is no default.** Every exception needs a choice and a reason of 5 to 300 characters. The model may propose a row; it never decides and never writes a version.
4. **Status travels with the value.** On screen and in the export, a figure appears together with its status in the same cell or line, so a crop or a copy does not strip it.
5. **Show the manual work and what Cuadre does not have.** Every cycle shows how many rows matched automatically, how many needed a person, how many data requests are open, and which data Cuadre lacks.

## NON-GOALS (what it will NEVER do)

- Never calculates producer-responsibility fees, files a declaration or gives regulatory advice.
- Never scores, ranks or removes a supplier.
- Never produces a recycling rate, a circularity score or any environmental-impact claim.
- Never stores data about waste collectors, informal workers or their transactions, and never profiles a worker.
- Never decides on a person's behalf and never pre-selects a choice.
- Never deletes or edits a saved version.
- Never presents invented demo data as real. Every demo row is labeled.

## NORTH STAR

**Active coordinator minutes to reconcile one second cycle with every exception decided and documented**, compared with her own spreadsheet baseline. The 10:1 target is one tenth of that baseline. Neither number exists yet: the baseline has not been timed and no real coordinator has used Cuadre. Until then the north star is a measurement to take, not a result.

## CORE CONCEPTS (the product's mini-ontology)

If a feature does not speak these nouns, it does not belong.

- **Componente:** one packaging part of one SKU (for example the lid of SKU A-102). Identified by SKU plus component name, ignoring case and accents.
- **Ciclo:** one round of data. The first approved cycle is the baseline; later cycles are compared with it.
- **Versión:** the immutable approved value of a component. Approving a cycle appends versions and never edits old ones.
- **Excepción:** a difference or gap that needs a person: changed, new, removed, conflict, missing, invalid, unsupported claim, possible double counting, paper source.
- **Decisión:** the choice (accept, keep previous, request from supplier, reject) plus the reason, recorded against an exception.
- **Fuente:** where a value came from: file name and line, or a quote.
- **Estado de evidencia:** what is known about the support for a value: declared by the supplier, no document, paper record, proposed by the model and confirmed by a person.
- **Exportación:** the evidence file: each value with source, status, version, decision and reason.

## Changelog

- v0.1 (1 November 2026): first charter, written before the Week 12 rebuild. Principle 4 (status travels with the value) is new this week and comes from the extraction (Step 1 of my Method).
