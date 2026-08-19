/**
 * The analytics module's business logic — the one place both the write and the read
 * behavior lives.
 *
 * Every access route goes through here. adr-graphql-query-transport requires REST and
 * GraphQL to be thin adapters over a single service, "a transport that grows logic of
 * its own is the failure mode this decision exists to prevent"; the same holds for the
 * file-based ingest path TASK-2mf2yu will add on the write side.
 */

import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { VariantRepository } from '../infrastructure/variant.repository';
import { validateVariantInput, type VariantSubmission } from '../domain/variant-input.validation';
import { validateVariantQuery } from '../domain/variant-query.validation';
import { encodeCursor } from '../domain/variant-cursor';
import type { Variant } from '../domain/variant';
import type { VariantPage, VariantQuery } from '../domain/variant-query';

/** What a caller gets back from a successful insert. */
export interface CreatedVariant {
  id: string;
}

@Injectable()
export class VariantService {
  constructor(private readonly repository: VariantRepository) {}

  /**
   * Validate and append a variant record.
   *
   * `id` and `created_at` are generated here and never read from the input — the
   * create descriptor makes them system-generated, and ANL-01 requires the ingest
   * timestamp to be the system's, not the client's. `version_date`, by contrast, is
   * the caller's: it is the record's logical version, which is what makes
   * out-of-order ingestion resolve correctly. A client that echoes back a record it
   * read still gets fresh system fields — the assignments below come after the spread,
   * so whatever it sent for them is overwritten rather than trusted.
   */
  async create(input: VariantSubmission): Promise<CreatedVariant> {
    validateVariantInput(input);

    const variant: Variant = {
      ...input,
      id: randomUUID(),
      created_at: new Date(),
    };

    await this.repository.insert(variant);

    return { id: variant.id };
  }

  /**
   * Read a page of current variants.
   *
   * The store is asked for one row beyond the page; its presence is what says another
   * page exists, and it is trimmed off before the page is handed back.
   */
  async query(query: VariantQuery): Promise<VariantPage> {
    const validated = validateVariantQuery(query);

    const rows = await this.repository.findCurrent(validated);
    const hasMore = rows.length > validated.limit;

    return {
      items: hasMore ? rows.slice(0, validated.limit) : rows,
      next_cursor: hasMore ? encodeCursor(validated.offset + validated.limit) : null,
    };
  }
}
