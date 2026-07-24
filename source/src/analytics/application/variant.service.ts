import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { NewVariant, Variant } from '../domain/variant';
import { VariantRepository } from '../infrastructure/variant.repository';

/**
 * Business logic for variants. Realizes analytics::variant::create (ANL-01):
 * assigns the system-generated fields and persists the record. Throws generic
 * `Error` on failure — translating to HTTP is the controller/filter's job.
 */
@Injectable()
export class VariantService {
  constructor(private readonly repository: VariantRepository) {}

  /**
   * Insert a variant. `id` and `created_at` are system-generated here and are not
   * taken from the caller. Returns the stored record's generated id.
   */
  async create(input: NewVariant): Promise<{ id: string }> {
    const variant: Variant = {
      ...input,
      id: uuidv4(),
      created_at: new Date(),
    };

    await this.repository.insert(variant);

    return { id: variant.id };
  }
}
