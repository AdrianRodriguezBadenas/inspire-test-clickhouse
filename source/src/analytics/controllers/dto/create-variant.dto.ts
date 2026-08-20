/**
 * The request body of `POST /variants` — transport shape and the Swagger surface.
 *
 * Generated from the entity spec's field table, so the documented body cannot drift
 * from the stored record. Every property is optional and only its **type** is checked
 * here: which fields are required, and which enumerated values are allowed, are domain
 * rules that also have to hold for the file-based ingest path (TASK-2mf2yu), so they
 * live in `variant-input.validation.ts` instead.
 */

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { VariantOrigin, VariantType, type VariantInput } from '../../domain/variant';

export class CreateVariantDto implements Partial<VariantInput> {
  @ApiProperty({
    description: 'Project scope; supplied by the caller. Part of the natural key.',
    example: 42,
  })
  @IsOptional()
  @IsInt()
  project_id?: number;

  @ApiProperty({
    description: 'Caller-supplied logical version; greatest per natural key is current.',
    // ISO 8601. Without an example Swagger UI generates the string "string", which fails
    // `@IsDate` — the exact 400 that made "Try it out" unusable.
    example: '2026-07-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  version_date?: Date;

  @ApiProperty({
    description: 'Variant URI. Part of the natural key.',
    example: 'chr1:12345:A:T',
  })
  @IsOptional()
  @IsString()
  uri?: string;

  @ApiProperty({
    description: 'Enum: GERMLINE / SOMATIC / TRIO / PGx.',
    enum: VariantOrigin,
    example: VariantOrigin.GERMLINE,
  })
  @IsOptional()
  origin?: VariantOrigin;

  @ApiProperty({
    description: 'Enum: SNV/INDEL / SV / CNV.',
    enum: VariantType,
    example: VariantType.SNV_INDEL,
  })
  @IsOptional()
  type?: VariantType;

  @ApiProperty({
    description: 'Source collection. Part of the natural key.',
    example: 'study-1',
  })
  @IsOptional()
  @IsString()
  collection?: string;

  @ApiProperty({ description: 'HPO codes.', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hpo?: string[];

  @ApiProperty({ description: 'Variant score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  score?: number | null;

  @ApiProperty({ description: 'Allele frequency.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  allele_frequency?: number | null;

  @ApiProperty({ description: 'Source user id.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  user_id?: number | null;

  @ApiProperty({ description: 'Annotation pipeline version.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  annotation_version?: string | null;

  @ApiProperty({ description: 'Segregation variant category (enum).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  trio_variant_category?: string | null;

  @ApiProperty({ description: 'Zygosity-combination tag (enum).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  trio_category_tag?: string | null;

  @ApiProperty({ description: 'Zygosity ind.I (proband): HOM/HET/REF/NO-COV.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  ind1_zygosity?: string | null;

  @ApiProperty({ description: 'VAF (%) ind.I.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  ind1_vaf?: number | null;

  @ApiProperty({ description: 'Read depth ind.I.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  ind1_dp?: number | null;

  @ApiProperty({ description: 'Zygosity ind.II (father).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  ind2_zygosity?: string | null;

  @ApiProperty({ description: 'VAF (%) ind.II.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  ind2_vaf?: number | null;

  @ApiProperty({ description: 'Read depth ind.II.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  ind2_dp?: number | null;

  @ApiProperty({ description: 'Zygosity ind.III (mother).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  ind3_zygosity?: string | null;

  @ApiProperty({ description: 'VAF (%) ind.III.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  ind3_vaf?: number | null;

  @ApiProperty({ description: 'Read depth ind.III.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  ind3_dp?: number | null;

  @ApiProperty({ description: 'Reference genome (required within the optional position block).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pos_genome?: string | null;

  @ApiProperty({ description: 'Chromosome (required within the optional position block).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pos_chr?: string | null;

  @ApiProperty({ description: 'Position (required within the optional position block).', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  pos_position?: number | null;

  @ApiProperty({ description: 'Identifier.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pos_id?: string | null;

  @ApiProperty({ description: 'SV end position.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  pos_sv_end?: number | null;

  @ApiProperty({ description: 'SV length.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  pos_sv_len?: number | null;

  @ApiProperty({ description: 'Strand bias.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pos_sb?: string | null;

  @ApiProperty({ description: 'Segmental-duplication overlap.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pos_seg_dup?: string | null;

  @ApiProperty({ description: 'Chromosomal band.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pos_chrom_band?: string | null;

  @ApiProperty({ description: 'Overlapping microsatellites id.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pos_microsat?: string | null;

  @ApiProperty({ description: 'REF allele base(s).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_allele_ref?: string | null;

  @ApiProperty({ description: 'ALT allele base(s).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_allele_alt?: string | null;

  @ApiProperty({ description: 'Allele number from VCF.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_allele_num?: string | null;

  @ApiProperty({ description: 'Allele used for consequence.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_allele?: string | null;

  @ApiProperty({ description: 'Computed genotype.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_calc_genotype?: string | null;

  @ApiProperty({ description: 'Zygosity: HOM/HET/HEM.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_zyg?: string | null;

  @ApiProperty({ description: 'Ancestral allele.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_aa?: string | null;

  @ApiProperty({ description: 'Allele count.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_ac?: string | null;

  @ApiProperty({ description: 'Allele frequency (per ALT).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_af?: string | null;

  @ApiProperty({ description: 'Total alleles in called genotypes.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  gt_an?: number | null;

  @ApiProperty({ description: 'CIGAR string.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_cigar?: string | null;

  @ApiProperty({ description: 'dbSNP membership.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_db?: string | null;

  @ApiProperty({ description: 'End position (symbolic alleles).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_end?: string | null;

  @ApiProperty({ description: 'HapMap2 membership.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_h2?: string | null;

  @ApiProperty({ description: 'HapMap3 membership.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_h3?: string | null;

  @ApiProperty({ description: 'FORMAT genotype.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_format_gt?: string | null;

  @ApiProperty({ description: 'Sample genotype filter.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_format_ft?: string | null;

  @ApiProperty({ description: 'Genotype likelihoods.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_format_gl?: string | null;

  @ApiProperty({ description: 'Genotype likelihoods (heterogeneous ploidy).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_format_gle?: string | null;

  @ApiProperty({ description: 'Phred-scaled genotype likelihoods.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_format_pl?: string | null;

  @ApiProperty({ description: 'Phred-scaled genotype posteriors.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  gt_format_gp?: number | null;

  @ApiProperty({ description: 'Conditional genotype quality.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  gt_format_gq?: number | null;

  @ApiProperty({ description: 'Haplotype qualities.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_format_hq?: string | null;

  @ApiProperty({ description: 'Phase set.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  gt_format_ps?: number | null;

  @ApiProperty({ description: 'Phasing quality.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  gt_format_pq?: number | null;

  @ApiProperty({ description: 'Expected alt allele counts.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_format_ec?: string | null;

  @ApiProperty({ description: 'RMS mapping quality (FORMAT).', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  gt_format_mq?: number | null;

  @ApiProperty({ description: 'Characterization technique (enum).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gt_technique?: string | null;

  @ApiProperty({ description: 'Filter status.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  call_filter?: string | null;

  @ApiProperty({ description: 'Phred-scaled quality in ALT.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_quality?: number | null;

  @ApiProperty({ description: 'Number of REF reads.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_read_depth_ref?: number | null;

  @ApiProperty({ description: '% REF reads.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_read_pct_ref?: number | null;

  @ApiProperty({ description: 'Number of ALT reads.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_read_depth_alt?: number | null;

  @ApiProperty({ description: '% ALT reads.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_read_pct_alt?: number | null;

  @ApiProperty({ description: 'Total read depth.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_read_depth?: number | null;

  @ApiProperty({ description: 'RMS base quality.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_bq?: number | null;

  @ApiProperty({ description: 'Combined depth across samples.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_dp?: number | null;

  @ApiProperty({ description: 'RMS mapping quality (INFO).', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_mq?: number | null;

  @ApiProperty({ description: 'MAPQ==0 reads covering record.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_mq0?: number | null;

  @ApiProperty({ description: 'Samples with data.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  call_ns?: string | null;

  @ApiProperty({ description: 'Sample read depth.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_format_dp?: number | null;

  @ApiProperty({ description: 'SV CI around POS.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  call_sv_cipos?: string | null;

  @ApiProperty({ description: 'SV CI around END.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  call_sv_ciend?: string | null;

  @ApiProperty({ description: 'SV CI around inserted length.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  call_sv_cilen?: string | null;

  @ApiProperty({ description: 'SV read depth of breakend segment.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_sv_dp?: number | null;

  @ApiProperty({ description: 'SV read depth of adjacency.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  call_sv_dpadj?: string | null;

  @ApiProperty({ description: 'CNV fold change.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_fold_change?: number | null;

  @ApiProperty({ description: 'Read-orientation quality.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  call_roq?: number | null;

  @ApiProperty({ description: 'Known co-located variants.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  exist_existing_variation?: string | null;

  @ApiProperty({ description: 'Somatic status of existing variants.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  exist_somatic?: string | null;

  @ApiProperty({ description: 'Allele-specific clinical significance.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  exist_clin_sig?: string | null;

  @ApiProperty({ description: 'Phenotype membership.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  exist_pheno?: string | null;

  @ApiProperty({ description: 'dbSNP overlapping variant(s).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  exist_dbsnp?: string | null;

  @ApiProperty({ description: 'COSMIC overlapping variant(s).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  exist_cosmic?: string | null;

  @ApiProperty({ description: 'HGMD overlapping variant(s).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  exist_hgmd?: string | null;

  @ApiProperty({ description: 'Other overlapping variant(s).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  exist_others?: string | null;

  @ApiProperty({ description: 'dbSNP id (rsname).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  exist_dbsnp_id?: string | null;

  @ApiProperty({ description: 'dbSNP rs number.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  exist_dbsnp_rs?: string | null;

  @ApiProperty({ description: 'dbSNP rs links.', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exist_dbsnp_rs_url?: string[];

  @ApiProperty({ description: 'Variant suspect reason codes.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  exist_dbsnp_ssr?: string | null;

  @ApiProperty({ description: 'DGV variants inside this SV.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  exist_ensdgv?: string | null;

  @ApiProperty({ description: 'ClinVar variation id.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_clinvar?: string | null;

  @ApiProperty({ description: 'ClinVar variation link.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_clinvar_url?: string | null;

  @ApiProperty({ description: 'ClinVar clinical significance.', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clin_clinvar_clnsig?: string[];

  @ApiProperty({ description: 'ClinVar clinical significance (string).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_clinvar_clnsig_str?: string | null;

  @ApiProperty({ description: 'ClinVar review status.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_clinvar_clnrevstat?: string | null;

  @ApiProperty({ description: 'ClinVar preferred disease name.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_clinvar_clndn?: string | null;

  @ApiProperty({ description: 'ClinVar conflicting significance.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_clinvar_clnsigconf?: string | null;

  @ApiProperty({ description: 'ACMG classification prediction (enum).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_acmg?: string | null;

  @ApiProperty({ description: 'Gene phenotype association flag.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_gene_pheno?: string | null;

  @ApiProperty({ description: 'ClinVar CNV id.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_clinvar_cnv?: string | null;

  @ApiProperty({ description: 'dbVar pathogenic duplication overlap.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_dbvar_path_dup?: string | null;

  @ApiProperty({ description: 'dbVar pathogenic deletion overlap.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_dbvar_path_del?: string | null;

  @ApiProperty({ description: 'CIViC variant id.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_civic_variant_id?: string | null;

  @ApiProperty({ description: 'CIViC molecular profile name.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_civic_mp_name?: string | null;

  @ApiProperty({ description: 'CIViC molecular profile score.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_civic_mp_score?: string | null;

  @ApiProperty({ description: 'CIViC entity significance.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_civic_entity_significance?: string | null;

  @ApiProperty({ description: 'CIViC entity disease.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_civic_entity_disease?: string | null;

  @ApiProperty({ description: 'CIViC entity therapies.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_civic_entity_therapies?: string | null;

  @ApiProperty({ description: 'ClinGen clinical classification.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_clngen_cat?: string | null;

  @ApiProperty({ description: 'ClinGen ACMG criteria confirmed.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_clngen_met?: string | null;

  @ApiProperty({ description: 'ClinGen ACMG criteria excluded.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_clngen_not_met?: string | null;

  @ApiProperty({ description: 'Intogen cancer driver association.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_intogen?: string | null;

  @ApiProperty({ description: 'CancerVar score.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_cv_score?: string | null;

  @ApiProperty({ description: 'CancerVar AMP/ASCO/CAP classification.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_cv_classification?: string | null;

  @ApiProperty({ description: 'MedGen id.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_medgen_id?: string | null;

  @ApiProperty({ description: 'MedGen disease associated.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_medgen_disease?: string | null;

  @ApiProperty({ description: 'MedGen disease links.', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clin_medgen_disease_url?: string[];

  @ApiProperty({ description: 'Franklin search tag.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_franklin?: string | null;

  @ApiProperty({ description: 'Franklin search link.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_franklin_url?: string | null;

  @ApiProperty({ description: 'OMIM/ORPHANET disease ids.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  clin_disease_omim_orphanet?: string | null;

  @ApiProperty({ description: 'SIFT prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_sift_prediction?: string | null;

  @ApiProperty({ description: 'PolyPhen HVar prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_enspolyphen_prediction?: string | null;

  @ApiProperty({ description: 'REVEL prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_revel_prediction?: string | null;

  @ApiProperty({ description: 'PolyPhen HDIV prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_refpolyphen_prediction?: string | null;

  @ApiProperty({ description: 'LRT score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_lrt_score?: number | null;

  @ApiProperty({ description: 'MutationTaster score.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_mutationtaster_score?: string | null;

  @ApiProperty({ description: 'MutationAssessor score.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_mutationassessor_score?: string | null;

  @ApiProperty({ description: 'FATHMM score.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_fathmm_score?: string | null;

  @ApiProperty({ description: 'FATHMM-MKL score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_fathmm_mkl_score?: number | null;

  @ApiProperty({ description: 'MetaSVM score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_metasvm_score?: number | null;

  @ApiProperty({ description: 'MetaLR score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_metalr_score?: number | null;

  @ApiProperty({ description: 'GERP++ score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_gerp_rs?: number | null;

  @ApiProperty({ description: 'phyloP mammalian score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_phylop_mammalian?: number | null;

  @ApiProperty({ description: 'SiPhy 29-way logOdds score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_siphy_29way?: number | null;

  @ApiProperty({ description: 'CADD raw score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_cadd_raw?: number | null;

  @ApiProperty({ description: 'DANN score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_dann_score?: number | null;

  @ApiProperty({ description: 'Eigen raw score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_eigen_raw_coding?: number | null;

  @ApiProperty({ description: 'GenoCanyon score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_genocanyon_score?: number | null;

  @ApiProperty({ description: 'dbscSNV ADA score.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_ada_score?: string | null;

  @ApiProperty({ description: 'dbscSNV RF score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_rf_score?: number | null;

  @ApiProperty({ description: 'AlphaMissense prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_alphamissense_prediction?: string | null;

  @ApiProperty({ description: 'AlphaMissense score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_alphamissense_score?: number | null;

  @ApiProperty({ description: 'BayesDel addAF prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_bayesdel_addaf_prediction?: string | null;

  @ApiProperty({ description: 'BayesDel addAF score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_bayesdel_addaf_score?: number | null;

  @ApiProperty({ description: 'BayesDel noAF prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_bayesdel_noaf_prediction?: string | null;

  @ApiProperty({ description: 'CADD prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_cadd_prediction?: string | null;

  @ApiProperty({ description: 'CADD PHRED score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_cadd_phred_score?: number | null;

  @ApiProperty({ description: 'CAROL prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_carol_prediction?: string | null;

  @ApiProperty({ description: 'CAROL score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_carol_score?: number | null;

  @ApiProperty({ description: 'ClinPred prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_clinpred_prediction?: string | null;

  @ApiProperty({ description: 'ClinPred score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_clinpred_score?: number | null;

  @ApiProperty({ description: 'DANN prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_dann_prediction?: string | null;

  @ApiProperty({ description: 'EVE prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_eve_prediction?: string | null;

  @ApiProperty({ description: 'EVE score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_eve_score?: number | null;

  @ApiProperty({ description: 'LoFtool gene score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_loftool_score?: number | null;

  @ApiProperty({ description: 'MetaLR prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_metalr_prediction?: string | null;

  @ApiProperty({ description: 'MetaRNN prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_metarnn_prediction?: string | null;

  @ApiProperty({ description: 'MetaRNN score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_metarnn_score?: number | null;

  @ApiProperty({ description: 'PolyPhen score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_polyphen_score?: number | null;

  @ApiProperty({ description: 'PrimateAI prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_primateai_prediction?: string | null;

  @ApiProperty({ description: 'PrimateAI score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_primateai_score?: number | null;

  @ApiProperty({ description: 'REVEL score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_revel_score?: number | null;

  @ApiProperty({ description: 'SIFT score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_sift_score?: number | null;

  @ApiProperty({ description: 'SpadaHC summary.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_spadahc_sum?: string | null;

  @ApiProperty({ description: 'SpliceAI prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_spliceai_prediction?: string | null;

  @ApiProperty({ description: 'SpliceAI score AG.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_spliceai_ag?: number | null;

  @ApiProperty({ description: 'SpliceAI score AL.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_spliceai_al?: number | null;

  @ApiProperty({ description: 'SpliceAI score DG.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_spliceai_dg?: number | null;

  @ApiProperty({ description: 'SpliceAI score DL.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_spliceai_dl?: number | null;

  @ApiProperty({ description: 'VEST4 prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_vest4_prediction?: string | null;

  @ApiProperty({ description: 'VEST4 score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_vest4_score?: number | null;

  @ApiProperty({ description: 'GERP++ prediction.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_gerp_prediction?: string | null;

  @ApiProperty({ description: 'Exomiser phenotypic variant score.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_exomiser_variant_score?: number | null;

  @ApiProperty({ description: 'SpliceAI delta score acceptor gain.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_spliceai_ds_ag?: number | null;

  @ApiProperty({ description: 'SpliceAI delta score acceptor loss.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_spliceai_ds_al?: number | null;

  @ApiProperty({ description: 'SpliceAI delta score donor gain.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_spliceai_ds_dg?: number | null;

  @ApiProperty({ description: 'SpliceAI delta score donor loss.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_spliceai_ds_dl?: number | null;

  @ApiProperty({ description: 'SpliceAI delta position acceptor gain.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_spliceai_dp_ag?: number | null;

  @ApiProperty({ description: 'SpliceAI delta position acceptor loss.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_spliceai_dp_al?: number | null;

  @ApiProperty({ description: 'SpliceAI delta position donor gain.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_spliceai_dp_dg?: number | null;

  @ApiProperty({ description: 'SpliceAI delta position donor loss.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  pred_spliceai_dp_dl?: number | null;

  @ApiProperty({ description: 'MitoMap score interpretation.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_mitomap_mtscore?: string | null;

  @ApiProperty({ description: 'MitoMap quartile of raw scores.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  pred_mitomap_quartile?: string | null;

  @ApiProperty({ description: 'Highest AF in any population.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_max_af?: number | null;

  @ApiProperty({ description: 'Max-AF source population.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  popaf_max_af_pops?: string | null;

  @ApiProperty({ description: '1000G global.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_1kg_all?: number | null;

  @ApiProperty({ description: '1000G African.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_1kg_afr?: number | null;

  @ApiProperty({ description: '1000G American.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_1kg_amr?: number | null;

  @ApiProperty({ description: '1000G East Asian.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_1kg_eas?: number | null;

  @ApiProperty({ description: '1000G European.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_1kg_eur?: number | null;

  @ApiProperty({ description: '1000G South Asian.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_1kg_sas?: number | null;

  @ApiProperty({ description: 'gnomAD exome combined.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomade?: number | null;

  @ApiProperty({ description: 'gnomAD exome African.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomade_afr?: number | null;

  @ApiProperty({ description: 'gnomAD exome Latino.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomade_amr?: number | null;

  @ApiProperty({ description: 'gnomAD exome Ashkenazi.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomade_asj?: number | null;

  @ApiProperty({ description: 'gnomAD exome East Asian.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomade_eas?: number | null;

  @ApiProperty({ description: 'gnomAD exome Finnish.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomade_fin?: number | null;

  @ApiProperty({ description: 'gnomAD exome non-Finnish European.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomade_nfe?: number | null;

  @ApiProperty({ description: 'gnomAD exome other.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomade_oth?: number | null;

  @ApiProperty({ description: 'gnomAD exome South Asian.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomade_sas?: number | null;

  @ApiProperty({ description: 'gnomAD genome combined.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomadg?: number | null;

  @ApiProperty({ description: 'gnomAD genome African.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_afr?: number | null;

  @ApiProperty({ description: 'gnomAD genome Amish.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_ami?: number | null;

  @ApiProperty({ description: 'gnomAD genome Latino.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_amr?: number | null;

  @ApiProperty({ description: 'gnomAD genome Ashkenazi.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_asj?: number | null;

  @ApiProperty({ description: 'gnomAD genome East Asian.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_eas?: number | null;

  @ApiProperty({ description: 'gnomAD genome Finnish.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_fin?: number | null;

  @ApiProperty({ description: 'gnomAD genome Mid-eastern.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_mid?: number | null;

  @ApiProperty({ description: 'gnomAD genome non-Finnish European.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_nfe?: number | null;

  @ApiProperty({ description: 'gnomAD genome other.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_oth?: number | null;

  @ApiProperty({ description: 'gnomAD genome South Asian.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_sas?: number | null;

  @ApiProperty({ description: 'gnomAD SV evidence.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  popaf_gnomad_sv_evidence?: string | null;

  @ApiProperty({ description: 'gnomAD SV type.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  popaf_gnomad_sv_svtype?: string | null;

  @ApiProperty({ description: 'gnomAD SV allele frequency.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  popaf_gnomad_sv_af?: string | null;

  @ApiProperty({ description: 'gnomAD mito allele count homoplasmy.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomad_mito_ac_hom?: number | null;

  @ApiProperty({ description: 'gnomAD mito allele freq homoplasmy.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomad_mito_af_hom?: number | null;

  @ApiProperty({ description: 'gnomAD mito allele count heteroplasmy.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomad_mito_ac_het?: number | null;

  @ApiProperty({ description: 'gnomAD mito allele freq heteroplasmy.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_gnomad_mito_af_het?: number | null;

  @ApiProperty({ description: 'ExAC allele frequency.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  popaf_exac_af?: string | null;

  @ApiProperty({ description: 'ExAC total allele number.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  popaf_exac_an?: string | null;

  @ApiProperty({ description: 'ExAC ALT count.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  popaf_exac_ac?: string | null;

  @ApiProperty({ description: 'ExAC hemizygous count.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  popaf_exac_ac_hemi?: string | null;

  @ApiProperty({ description: 'ExAC heterozygous count.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  popaf_exac_ac_het?: string | null;

  @ApiProperty({ description: 'ExAC homozygous count.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  popaf_exac_ac_homo?: string | null;

  @ApiProperty({ description: 'gnomAD coordinate string.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  popaf_gnomad_id?: string | null;

  @ApiProperty({ description: 'gnomAD link.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  popaf_gnomad_id_url?: string | null;

  @ApiProperty({ description: 'pLI gene loss-of-function tolerance.', required: false, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  popaf_pli_gene_score?: number | null;

  @ApiProperty({ description: 'Ensembl stable gene id.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gene_ensembl_gene?: string | null;

  @ApiProperty({ description: 'Gene symbol.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gene_symbol?: string | null;

  @ApiProperty({ description: 'Gene symbol source.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gene_symbol_source?: string | null;

  @ApiProperty({ description: 'HGNC gene id.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gene_hgnc_id?: string | null;

  @ApiProperty({ description: 'HGNC link.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  gene_hgnc_id_url?: string | null;

  @ApiProperty({ description: 'RefSeq consequence (VEP).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_consequence?: string | null;

  @ApiProperty({ description: 'Ensembl consequence (VEP).', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_ens_consequence?: string | null;

  @ApiProperty({ description: 'SO variant class.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_variant_class?: string | null;

  @ApiProperty({ description: 'RefSeq transcript id.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_feature?: string | null;

  @ApiProperty({ description: 'RefSeq transcript link.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_feature_url?: string | null;

  @ApiProperty({ description: 'RefSeq feature type.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_feature_type?: string | null;

  @ApiProperty({ description: 'RefSeq canonical flag.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_canonical?: string | null;

  @ApiProperty({ description: 'Genomic strand.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_strand?: string | null;

  @ApiProperty({ description: 'Ensembl HGVSc.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_ens_hgvsc?: string | null;

  @ApiProperty({ description: 'RefSeq HGVSc.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_hgvsc?: string | null;

  @ApiProperty({ description: 'Ensembl HGVSp.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_ens_hgvsp?: string | null;

  @ApiProperty({ description: 'HGVS genomic.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_hgvsg?: string | null;

  @ApiProperty({ description: 'HGVS offset.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_hgvs_offset?: string | null;

  @ApiProperty({ description: 'SPDI notation.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_spdi?: string | null;

  @ApiProperty({ description: 'GA4GH VRS.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_vrs?: string | null;

  @ApiProperty({ description: 'Consequence impact modifier.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_impact?: string | null;

  @ApiProperty({ description: 'Transcript/regulatory biotype.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_biotype?: string | null;

  @ApiProperty({ description: 'Ensembl exon number.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_ens_exon?: string | null;

  @ApiProperty({ description: 'Ensembl intron number.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_ens_intron?: string | null;

  @ApiProperty({ description: 'Ensembl cDNA position.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_ens_cdna_position?: string | null;

  @ApiProperty({ description: 'Ensembl CDS position.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_ens_cds_position?: string | null;

  @ApiProperty({ description: 'Ensembl protein position.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_ens_protein_position?: string | null;

  @ApiProperty({ description: 'Reference/variant amino acids.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_amino_acids?: string | null;

  @ApiProperty({ description: 'Reference/variant codons.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_codons?: string | null;

  @ApiProperty({ description: 'Distance variant→transcript.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_distance?: string | null;

  @ApiProperty({ description: 'Transcript quality flags.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_flags?: string | null;

  @ApiProperty({ description: 'PubMed ids.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_pubmed?: string | null;

  @ApiProperty({ description: 'PubMed links.', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  feat_pubmed_url?: string[];

  @ApiProperty({ description: 'Custom annotations.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_custom_annotation?: string | null;

  @ApiProperty({ description: 'Ensembl stable feature id.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_ens_feature?: string | null;

  @ApiProperty({ description: 'Ensembl feature link.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_ens_feature_url?: string | null;

  @ApiProperty({ description: 'Ensembl feature type.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_ens_feature_type?: string | null;

  @ApiProperty({ description: 'Ensembl canonical flag.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_ens_canonical?: string | null;

  @ApiProperty({ description: 'RefSeq HGVSp.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_hgvsp?: string | null;

  @ApiProperty({ description: 'RefSeq exon number.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_exon?: string | null;

  @ApiProperty({ description: 'RefSeq intron number.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_intron?: string | null;

  @ApiProperty({ description: 'RefSeq cDNA position.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_cdna_position?: string | null;

  @ApiProperty({ description: 'RefSeq CDS position.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_cds_position?: string | null;

  @ApiProperty({ description: 'RefSeq protein position.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_protein_position?: string | null;

  @ApiProperty({ description: 'Target gene.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  feat_target_gene?: string | null;

  @ApiProperty({ description: 'OMIM gene id.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  extdb_omim_id?: string | null;

  @ApiProperty({ description: 'OMIM links.', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extdb_omim_id_url?: string[];

  @ApiProperty({ description: 'SwissProt accessions.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  extdb_swissprot?: string | null;

  @ApiProperty({ description: 'TrEMBL accessions.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  extdb_trembl?: string | null;

  @ApiProperty({ description: 'UniParc accessions.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  extdb_uniparc?: string | null;

  @ApiProperty({ description: 'UniProt isoform accessions.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  extdb_uniprot_isoform?: string | null;

  @ApiProperty({ description: 'Orphanet gene id.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  extdb_orphanet?: string | null;

  @ApiProperty({ description: 'Orphanet links.', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extdb_orphanet_url?: string[];

  @ApiProperty({ description: 'GO terms associated.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  extdb_go?: string | null;

  @ApiProperty({ description: 'LOVD variant matching.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  extdb_lovd?: string | null;

  @ApiProperty({ description: 'GTEx mapping.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  extdb_gtex?: string | null;

  @ApiProperty({ description: 'GTEx link.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  extdb_gtex_url?: string | null;

  @ApiProperty({ description: 'Drug — CPIC level.', required: false, type: String, nullable: true })
  @IsOptional()
  @IsString()
  extdb_cpic?: string | null;
}
