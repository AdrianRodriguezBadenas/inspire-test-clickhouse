/**
 * The GraphQL read surface's types — the transport shape of ANL-02's structured query,
 * per adr-graphql-query-transport.
 *
 * Two things this file must keep true:
 *
 * - **The allow-lists are derived, never copied.** `VariantField` and
 *   `VariantOperator` are built from the same registry and operator set the domain
 *   validator enforces, because "two hand-maintained copies of a security boundary
 *   would drift, and the drift would open the boundary silently".
 * - **Query only.** No mutation and no subscription: production writes are file-based
 *   ingest, so there is no write to expose here.
 *
 * The object types are generated from the entity spec's field table. `origin` and
 * `type` are exposed as strings rather than schema enums: the entity spec's value
 * `SNV/INDEL` is not a legal GraphQL enum name, and rendering it as `SNV_INDEL` would
 * hand GraphQL clients a different value than REST clients get for the same record —
 * breaking the parity ANL-02 requires. The enums that matter to the *contract* (the
 * field and operator allow-lists) are schema enums, which is what the ADR asks for.
 */

import { Field, Float, GraphQLISODateTime, ID, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { VariantOrigin, VariantType } from '../../domain/variant';
import { VARIANT_FIELD_NAMES } from '../../domain/variant-fields';
import { SortDirection, VariantOperator } from '../../domain/variant-query';

registerEnumType(VariantOperator, {
  name: 'VariantOperator',
  description: 'The operators a condition leaf may use.',
});
registerEnumType(SortDirection, { name: 'SortDirection', description: 'Sort direction.' });

/**
 * The queryable columns, promoted from the registry into a schema enum so clients get
 * validation and autocompletion before they send a request.
 */
export const VariantField = Object.fromEntries(
  VARIANT_FIELD_NAMES.map((field) => [field, field]),
) as Record<string, string>;

registerEnumType(VariantField, {
  name: 'VariantField',
  description: 'The known variant columns a condition or ordering term may reference.',
});

@InputType({ description: 'A condition tree node: a combinator, or a {field, op, value} leaf.' })
export class VariantConditionInput {
  @Field(() => [VariantConditionInput], { nullable: true, description: 'All branches must match.' })
  and?: VariantConditionInput[] | null;

  @Field(() => [VariantConditionInput], { nullable: true, description: 'Any branch must match.' })
  or?: VariantConditionInput[] | null;

  @Field(() => VariantConditionInput, { nullable: true, description: 'The branch must not match.' })
  not?: VariantConditionInput | null;

  @Field(() => VariantField, { nullable: true, description: 'The column the leaf tests.' })
  field?: string | null;

  @Field(() => VariantOperator, { nullable: true, description: 'The comparison the leaf makes.' })
  op?: VariantOperator | null;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'The value compared against, typed per the field. A list for in / nin / between.',
  })
  value?: unknown;
}

@InputType({ description: 'One ordering term.' })
export class VariantOrderInput {
  @Field(() => VariantField, { description: 'The column to order by.' })
  field!: string;

  @Field(() => SortDirection, { nullable: true, description: 'Ascending unless stated.' })
  dir?: SortDirection | null;
}

@ObjectType('Variant', { description: 'An annotated genomic variant — the current version.' })
export class VariantObject {
  @Field(() => ID, { description: 'Surrogate primary key; generated at insert.' })
  id!: string;

  @Field(() => Int, { description: 'Project scope; supplied by the caller. Part of the natural key.' })
  project_id!: number;

  @Field(() => GraphQLISODateTime, { description: 'Ingest timestamp; set by the system (audit).' })
  created_at!: Date;

  @Field(() => GraphQLISODateTime, { description: 'Caller-supplied logical version; greatest per natural key is current.' })
  version_date!: Date;

  @Field(() => String, { description: 'Variant URI. Part of the natural key.' })
  uri!: string;

  @Field(() => String, { description: 'Enum: GERMLINE / SOMATIC / TRIO / PGx.' })
  origin!: VariantOrigin;

  @Field(() => String, { description: 'Enum: SNV/INDEL / SV / CNV.' })
  type!: VariantType;

  @Field(() => String, { description: 'Source collection. Part of the natural key.' })
  collection!: string;

  @Field(() => [String], { description: 'HPO codes.', nullable: true })
  hpo?: string[] | null;

  @Field(() => Float, { description: 'Variant score.', nullable: true })
  score?: number | null;

  @Field(() => Float, { description: 'Allele frequency.', nullable: true })
  allele_frequency?: number | null;

  @Field(() => Int, { description: 'Source user id.', nullable: true })
  user_id?: number | null;

  @Field(() => String, { description: 'Annotation pipeline version.', nullable: true })
  annotation_version?: string | null;

  @Field(() => String, { description: 'Segregation variant category (enum).', nullable: true })
  trio_variant_category?: string | null;

  @Field(() => String, { description: 'Zygosity-combination tag (enum).', nullable: true })
  trio_category_tag?: string | null;

  @Field(() => String, { description: 'Zygosity ind.I (proband): HOM/HET/REF/NO-COV.', nullable: true })
  ind1_zygosity?: string | null;

  @Field(() => Float, { description: 'VAF (%) ind.I.', nullable: true })
  ind1_vaf?: number | null;

  @Field(() => Float, { description: 'Read depth ind.I.', nullable: true })
  ind1_dp?: number | null;

  @Field(() => String, { description: 'Zygosity ind.II (father).', nullable: true })
  ind2_zygosity?: string | null;

  @Field(() => Float, { description: 'VAF (%) ind.II.', nullable: true })
  ind2_vaf?: number | null;

  @Field(() => Float, { description: 'Read depth ind.II.', nullable: true })
  ind2_dp?: number | null;

  @Field(() => String, { description: 'Zygosity ind.III (mother).', nullable: true })
  ind3_zygosity?: string | null;

  @Field(() => Float, { description: 'VAF (%) ind.III.', nullable: true })
  ind3_vaf?: number | null;

  @Field(() => Float, { description: 'Read depth ind.III.', nullable: true })
  ind3_dp?: number | null;

  @Field(() => String, { description: 'Reference genome (required within the optional position block).', nullable: true })
  pos_genome?: string | null;

  @Field(() => String, { description: 'Chromosome (required within the optional position block).', nullable: true })
  pos_chr?: string | null;

  @Field(() => Int, { description: 'Position (required within the optional position block).', nullable: true })
  pos_position?: number | null;

  @Field(() => String, { description: 'Identifier.', nullable: true })
  pos_id?: string | null;

  @Field(() => Int, { description: 'SV end position.', nullable: true })
  pos_sv_end?: number | null;

  @Field(() => Int, { description: 'SV length.', nullable: true })
  pos_sv_len?: number | null;

  @Field(() => String, { description: 'Strand bias.', nullable: true })
  pos_sb?: string | null;

  @Field(() => String, { description: 'Segmental-duplication overlap.', nullable: true })
  pos_seg_dup?: string | null;

  @Field(() => String, { description: 'Chromosomal band.', nullable: true })
  pos_chrom_band?: string | null;

  @Field(() => String, { description: 'Overlapping microsatellites id.', nullable: true })
  pos_microsat?: string | null;

  @Field(() => String, { description: 'REF allele base(s).', nullable: true })
  gt_allele_ref?: string | null;

  @Field(() => String, { description: 'ALT allele base(s).', nullable: true })
  gt_allele_alt?: string | null;

  @Field(() => String, { description: 'Allele number from VCF.', nullable: true })
  gt_allele_num?: string | null;

  @Field(() => String, { description: 'Allele used for consequence.', nullable: true })
  gt_allele?: string | null;

  @Field(() => String, { description: 'Computed genotype.', nullable: true })
  gt_calc_genotype?: string | null;

  @Field(() => String, { description: 'Zygosity: HOM/HET/HEM.', nullable: true })
  gt_zyg?: string | null;

  @Field(() => String, { description: 'Ancestral allele.', nullable: true })
  gt_aa?: string | null;

  @Field(() => String, { description: 'Allele count.', nullable: true })
  gt_ac?: string | null;

  @Field(() => String, { description: 'Allele frequency (per ALT).', nullable: true })
  gt_af?: string | null;

  @Field(() => Int, { description: 'Total alleles in called genotypes.', nullable: true })
  gt_an?: number | null;

  @Field(() => String, { description: 'CIGAR string.', nullable: true })
  gt_cigar?: string | null;

  @Field(() => String, { description: 'dbSNP membership.', nullable: true })
  gt_db?: string | null;

  @Field(() => String, { description: 'End position (symbolic alleles).', nullable: true })
  gt_end?: string | null;

  @Field(() => String, { description: 'HapMap2 membership.', nullable: true })
  gt_h2?: string | null;

  @Field(() => String, { description: 'HapMap3 membership.', nullable: true })
  gt_h3?: string | null;

  @Field(() => String, { description: 'FORMAT genotype.', nullable: true })
  gt_format_gt?: string | null;

  @Field(() => String, { description: 'Sample genotype filter.', nullable: true })
  gt_format_ft?: string | null;

  @Field(() => String, { description: 'Genotype likelihoods.', nullable: true })
  gt_format_gl?: string | null;

  @Field(() => String, { description: 'Genotype likelihoods (heterogeneous ploidy).', nullable: true })
  gt_format_gle?: string | null;

  @Field(() => String, { description: 'Phred-scaled genotype likelihoods.', nullable: true })
  gt_format_pl?: string | null;

  @Field(() => Float, { description: 'Phred-scaled genotype posteriors.', nullable: true })
  gt_format_gp?: number | null;

  @Field(() => Float, { description: 'Conditional genotype quality.', nullable: true })
  gt_format_gq?: number | null;

  @Field(() => String, { description: 'Haplotype qualities.', nullable: true })
  gt_format_hq?: string | null;

  @Field(() => Int, { description: 'Phase set.', nullable: true })
  gt_format_ps?: number | null;

  @Field(() => Float, { description: 'Phasing quality.', nullable: true })
  gt_format_pq?: number | null;

  @Field(() => String, { description: 'Expected alt allele counts.', nullable: true })
  gt_format_ec?: string | null;

  @Field(() => Float, { description: 'RMS mapping quality (FORMAT).', nullable: true })
  gt_format_mq?: number | null;

  @Field(() => String, { description: 'Characterization technique (enum).', nullable: true })
  gt_technique?: string | null;

  @Field(() => String, { description: 'Filter status.', nullable: true })
  call_filter?: string | null;

  @Field(() => Float, { description: 'Phred-scaled quality in ALT.', nullable: true })
  call_quality?: number | null;

  @Field(() => Float, { description: 'Number of REF reads.', nullable: true })
  call_read_depth_ref?: number | null;

  @Field(() => Float, { description: '% REF reads.', nullable: true })
  call_read_pct_ref?: number | null;

  @Field(() => Float, { description: 'Number of ALT reads.', nullable: true })
  call_read_depth_alt?: number | null;

  @Field(() => Float, { description: '% ALT reads.', nullable: true })
  call_read_pct_alt?: number | null;

  @Field(() => Float, { description: 'Total read depth.', nullable: true })
  call_read_depth?: number | null;

  @Field(() => Float, { description: 'RMS base quality.', nullable: true })
  call_bq?: number | null;

  @Field(() => Float, { description: 'Combined depth across samples.', nullable: true })
  call_dp?: number | null;

  @Field(() => Float, { description: 'RMS mapping quality (INFO).', nullable: true })
  call_mq?: number | null;

  @Field(() => Float, { description: 'MAPQ==0 reads covering record.', nullable: true })
  call_mq0?: number | null;

  @Field(() => String, { description: 'Samples with data.', nullable: true })
  call_ns?: string | null;

  @Field(() => Float, { description: 'Sample read depth.', nullable: true })
  call_format_dp?: number | null;

  @Field(() => String, { description: 'SV CI around POS.', nullable: true })
  call_sv_cipos?: string | null;

  @Field(() => String, { description: 'SV CI around END.', nullable: true })
  call_sv_ciend?: string | null;

  @Field(() => String, { description: 'SV CI around inserted length.', nullable: true })
  call_sv_cilen?: string | null;

  @Field(() => Float, { description: 'SV read depth of breakend segment.', nullable: true })
  call_sv_dp?: number | null;

  @Field(() => String, { description: 'SV read depth of adjacency.', nullable: true })
  call_sv_dpadj?: string | null;

  @Field(() => Float, { description: 'CNV fold change.', nullable: true })
  call_fold_change?: number | null;

  @Field(() => Float, { description: 'Read-orientation quality.', nullable: true })
  call_roq?: number | null;

  @Field(() => String, { description: 'Known co-located variants.', nullable: true })
  exist_existing_variation?: string | null;

  @Field(() => String, { description: 'Somatic status of existing variants.', nullable: true })
  exist_somatic?: string | null;

  @Field(() => String, { description: 'Allele-specific clinical significance.', nullable: true })
  exist_clin_sig?: string | null;

  @Field(() => String, { description: 'Phenotype membership.', nullable: true })
  exist_pheno?: string | null;

  @Field(() => String, { description: 'dbSNP overlapping variant(s).', nullable: true })
  exist_dbsnp?: string | null;

  @Field(() => String, { description: 'COSMIC overlapping variant(s).', nullable: true })
  exist_cosmic?: string | null;

  @Field(() => String, { description: 'HGMD overlapping variant(s).', nullable: true })
  exist_hgmd?: string | null;

  @Field(() => String, { description: 'Other overlapping variant(s).', nullable: true })
  exist_others?: string | null;

  @Field(() => String, { description: 'dbSNP id (rsname).', nullable: true })
  exist_dbsnp_id?: string | null;

  @Field(() => String, { description: 'dbSNP rs number.', nullable: true })
  exist_dbsnp_rs?: string | null;

  @Field(() => [String], { description: 'dbSNP rs links.', nullable: true })
  exist_dbsnp_rs_url?: string[] | null;

  @Field(() => String, { description: 'Variant suspect reason codes.', nullable: true })
  exist_dbsnp_ssr?: string | null;

  @Field(() => String, { description: 'DGV variants inside this SV.', nullable: true })
  exist_ensdgv?: string | null;

  @Field(() => String, { description: 'ClinVar variation id.', nullable: true })
  clin_clinvar?: string | null;

  @Field(() => String, { description: 'ClinVar variation link.', nullable: true })
  clin_clinvar_url?: string | null;

  @Field(() => [String], { description: 'ClinVar clinical significance.', nullable: true })
  clin_clinvar_clnsig?: string[] | null;

  @Field(() => String, { description: 'ClinVar clinical significance (string).', nullable: true })
  clin_clinvar_clnsig_str?: string | null;

  @Field(() => String, { description: 'ClinVar review status.', nullable: true })
  clin_clinvar_clnrevstat?: string | null;

  @Field(() => String, { description: 'ClinVar preferred disease name.', nullable: true })
  clin_clinvar_clndn?: string | null;

  @Field(() => String, { description: 'ClinVar conflicting significance.', nullable: true })
  clin_clinvar_clnsigconf?: string | null;

  @Field(() => String, { description: 'ACMG classification prediction (enum).', nullable: true })
  clin_acmg?: string | null;

  @Field(() => String, { description: 'Gene phenotype association flag.', nullable: true })
  clin_gene_pheno?: string | null;

  @Field(() => String, { description: 'ClinVar CNV id.', nullable: true })
  clin_clinvar_cnv?: string | null;

  @Field(() => String, { description: 'dbVar pathogenic duplication overlap.', nullable: true })
  clin_dbvar_path_dup?: string | null;

  @Field(() => String, { description: 'dbVar pathogenic deletion overlap.', nullable: true })
  clin_dbvar_path_del?: string | null;

  @Field(() => String, { description: 'CIViC variant id.', nullable: true })
  clin_civic_variant_id?: string | null;

  @Field(() => String, { description: 'CIViC molecular profile name.', nullable: true })
  clin_civic_mp_name?: string | null;

  @Field(() => String, { description: 'CIViC molecular profile score.', nullable: true })
  clin_civic_mp_score?: string | null;

  @Field(() => String, { description: 'CIViC entity significance.', nullable: true })
  clin_civic_entity_significance?: string | null;

  @Field(() => String, { description: 'CIViC entity disease.', nullable: true })
  clin_civic_entity_disease?: string | null;

  @Field(() => String, { description: 'CIViC entity therapies.', nullable: true })
  clin_civic_entity_therapies?: string | null;

  @Field(() => String, { description: 'ClinGen clinical classification.', nullable: true })
  clin_clngen_cat?: string | null;

  @Field(() => String, { description: 'ClinGen ACMG criteria confirmed.', nullable: true })
  clin_clngen_met?: string | null;

  @Field(() => String, { description: 'ClinGen ACMG criteria excluded.', nullable: true })
  clin_clngen_not_met?: string | null;

  @Field(() => String, { description: 'Intogen cancer driver association.', nullable: true })
  clin_intogen?: string | null;

  @Field(() => String, { description: 'CancerVar score.', nullable: true })
  clin_cv_score?: string | null;

  @Field(() => String, { description: 'CancerVar AMP/ASCO/CAP classification.', nullable: true })
  clin_cv_classification?: string | null;

  @Field(() => String, { description: 'MedGen id.', nullable: true })
  clin_medgen_id?: string | null;

  @Field(() => String, { description: 'MedGen disease associated.', nullable: true })
  clin_medgen_disease?: string | null;

  @Field(() => [String], { description: 'MedGen disease links.', nullable: true })
  clin_medgen_disease_url?: string[] | null;

  @Field(() => String, { description: 'Franklin search tag.', nullable: true })
  clin_franklin?: string | null;

  @Field(() => String, { description: 'Franklin search link.', nullable: true })
  clin_franklin_url?: string | null;

  @Field(() => String, { description: 'OMIM/ORPHANET disease ids.', nullable: true })
  clin_disease_omim_orphanet?: string | null;

  @Field(() => String, { description: 'SIFT prediction.', nullable: true })
  pred_sift_prediction?: string | null;

  @Field(() => String, { description: 'PolyPhen HVar prediction.', nullable: true })
  pred_enspolyphen_prediction?: string | null;

  @Field(() => String, { description: 'REVEL prediction.', nullable: true })
  pred_revel_prediction?: string | null;

  @Field(() => String, { description: 'PolyPhen HDIV prediction.', nullable: true })
  pred_refpolyphen_prediction?: string | null;

  @Field(() => Float, { description: 'LRT score.', nullable: true })
  pred_lrt_score?: number | null;

  @Field(() => String, { description: 'MutationTaster score.', nullable: true })
  pred_mutationtaster_score?: string | null;

  @Field(() => String, { description: 'MutationAssessor score.', nullable: true })
  pred_mutationassessor_score?: string | null;

  @Field(() => String, { description: 'FATHMM score.', nullable: true })
  pred_fathmm_score?: string | null;

  @Field(() => Float, { description: 'FATHMM-MKL score.', nullable: true })
  pred_fathmm_mkl_score?: number | null;

  @Field(() => Float, { description: 'MetaSVM score.', nullable: true })
  pred_metasvm_score?: number | null;

  @Field(() => Float, { description: 'MetaLR score.', nullable: true })
  pred_metalr_score?: number | null;

  @Field(() => Float, { description: 'GERP++ score.', nullable: true })
  pred_gerp_rs?: number | null;

  @Field(() => Float, { description: 'phyloP mammalian score.', nullable: true })
  pred_phylop_mammalian?: number | null;

  @Field(() => Float, { description: 'SiPhy 29-way logOdds score.', nullable: true })
  pred_siphy_29way?: number | null;

  @Field(() => Float, { description: 'CADD raw score.', nullable: true })
  pred_cadd_raw?: number | null;

  @Field(() => Float, { description: 'DANN score.', nullable: true })
  pred_dann_score?: number | null;

  @Field(() => Float, { description: 'Eigen raw score.', nullable: true })
  pred_eigen_raw_coding?: number | null;

  @Field(() => Float, { description: 'GenoCanyon score.', nullable: true })
  pred_genocanyon_score?: number | null;

  @Field(() => String, { description: 'dbscSNV ADA score.', nullable: true })
  pred_ada_score?: string | null;

  @Field(() => Float, { description: 'dbscSNV RF score.', nullable: true })
  pred_rf_score?: number | null;

  @Field(() => String, { description: 'AlphaMissense prediction.', nullable: true })
  pred_alphamissense_prediction?: string | null;

  @Field(() => Float, { description: 'AlphaMissense score.', nullable: true })
  pred_alphamissense_score?: number | null;

  @Field(() => String, { description: 'BayesDel addAF prediction.', nullable: true })
  pred_bayesdel_addaf_prediction?: string | null;

  @Field(() => Float, { description: 'BayesDel addAF score.', nullable: true })
  pred_bayesdel_addaf_score?: number | null;

  @Field(() => String, { description: 'BayesDel noAF prediction.', nullable: true })
  pred_bayesdel_noaf_prediction?: string | null;

  @Field(() => String, { description: 'CADD prediction.', nullable: true })
  pred_cadd_prediction?: string | null;

  @Field(() => Float, { description: 'CADD PHRED score.', nullable: true })
  pred_cadd_phred_score?: number | null;

  @Field(() => String, { description: 'CAROL prediction.', nullable: true })
  pred_carol_prediction?: string | null;

  @Field(() => Float, { description: 'CAROL score.', nullable: true })
  pred_carol_score?: number | null;

  @Field(() => String, { description: 'ClinPred prediction.', nullable: true })
  pred_clinpred_prediction?: string | null;

  @Field(() => Float, { description: 'ClinPred score.', nullable: true })
  pred_clinpred_score?: number | null;

  @Field(() => String, { description: 'DANN prediction.', nullable: true })
  pred_dann_prediction?: string | null;

  @Field(() => String, { description: 'EVE prediction.', nullable: true })
  pred_eve_prediction?: string | null;

  @Field(() => Float, { description: 'EVE score.', nullable: true })
  pred_eve_score?: number | null;

  @Field(() => Float, { description: 'LoFtool gene score.', nullable: true })
  pred_loftool_score?: number | null;

  @Field(() => String, { description: 'MetaLR prediction.', nullable: true })
  pred_metalr_prediction?: string | null;

  @Field(() => String, { description: 'MetaRNN prediction.', nullable: true })
  pred_metarnn_prediction?: string | null;

  @Field(() => Float, { description: 'MetaRNN score.', nullable: true })
  pred_metarnn_score?: number | null;

  @Field(() => Float, { description: 'PolyPhen score.', nullable: true })
  pred_polyphen_score?: number | null;

  @Field(() => String, { description: 'PrimateAI prediction.', nullable: true })
  pred_primateai_prediction?: string | null;

  @Field(() => Float, { description: 'PrimateAI score.', nullable: true })
  pred_primateai_score?: number | null;

  @Field(() => Float, { description: 'REVEL score.', nullable: true })
  pred_revel_score?: number | null;

  @Field(() => Float, { description: 'SIFT score.', nullable: true })
  pred_sift_score?: number | null;

  @Field(() => String, { description: 'SpadaHC summary.', nullable: true })
  pred_spadahc_sum?: string | null;

  @Field(() => String, { description: 'SpliceAI prediction.', nullable: true })
  pred_spliceai_prediction?: string | null;

  @Field(() => Float, { description: 'SpliceAI score AG.', nullable: true })
  pred_spliceai_ag?: number | null;

  @Field(() => Float, { description: 'SpliceAI score AL.', nullable: true })
  pred_spliceai_al?: number | null;

  @Field(() => Float, { description: 'SpliceAI score DG.', nullable: true })
  pred_spliceai_dg?: number | null;

  @Field(() => Float, { description: 'SpliceAI score DL.', nullable: true })
  pred_spliceai_dl?: number | null;

  @Field(() => String, { description: 'VEST4 prediction.', nullable: true })
  pred_vest4_prediction?: string | null;

  @Field(() => Float, { description: 'VEST4 score.', nullable: true })
  pred_vest4_score?: number | null;

  @Field(() => String, { description: 'GERP++ prediction.', nullable: true })
  pred_gerp_prediction?: string | null;

  @Field(() => Float, { description: 'Exomiser phenotypic variant score.', nullable: true })
  pred_exomiser_variant_score?: number | null;

  @Field(() => Float, { description: 'SpliceAI delta score acceptor gain.', nullable: true })
  pred_spliceai_ds_ag?: number | null;

  @Field(() => Float, { description: 'SpliceAI delta score acceptor loss.', nullable: true })
  pred_spliceai_ds_al?: number | null;

  @Field(() => Float, { description: 'SpliceAI delta score donor gain.', nullable: true })
  pred_spliceai_ds_dg?: number | null;

  @Field(() => Float, { description: 'SpliceAI delta score donor loss.', nullable: true })
  pred_spliceai_ds_dl?: number | null;

  @Field(() => Float, { description: 'SpliceAI delta position acceptor gain.', nullable: true })
  pred_spliceai_dp_ag?: number | null;

  @Field(() => Float, { description: 'SpliceAI delta position acceptor loss.', nullable: true })
  pred_spliceai_dp_al?: number | null;

  @Field(() => Float, { description: 'SpliceAI delta position donor gain.', nullable: true })
  pred_spliceai_dp_dg?: number | null;

  @Field(() => Float, { description: 'SpliceAI delta position donor loss.', nullable: true })
  pred_spliceai_dp_dl?: number | null;

  @Field(() => String, { description: 'MitoMap score interpretation.', nullable: true })
  pred_mitomap_mtscore?: string | null;

  @Field(() => String, { description: 'MitoMap quartile of raw scores.', nullable: true })
  pred_mitomap_quartile?: string | null;

  @Field(() => Float, { description: 'Highest AF in any population.', nullable: true })
  popaf_max_af?: number | null;

  @Field(() => String, { description: 'Max-AF source population.', nullable: true })
  popaf_max_af_pops?: string | null;

  @Field(() => Float, { description: '1000G global.', nullable: true })
  popaf_1kg_all?: number | null;

  @Field(() => Float, { description: '1000G African.', nullable: true })
  popaf_1kg_afr?: number | null;

  @Field(() => Float, { description: '1000G American.', nullable: true })
  popaf_1kg_amr?: number | null;

  @Field(() => Float, { description: '1000G East Asian.', nullable: true })
  popaf_1kg_eas?: number | null;

  @Field(() => Float, { description: '1000G European.', nullable: true })
  popaf_1kg_eur?: number | null;

  @Field(() => Float, { description: '1000G South Asian.', nullable: true })
  popaf_1kg_sas?: number | null;

  @Field(() => Float, { description: 'gnomAD exome combined.', nullable: true })
  popaf_gnomade?: number | null;

  @Field(() => Float, { description: 'gnomAD exome African.', nullable: true })
  popaf_gnomade_afr?: number | null;

  @Field(() => Float, { description: 'gnomAD exome Latino.', nullable: true })
  popaf_gnomade_amr?: number | null;

  @Field(() => Float, { description: 'gnomAD exome Ashkenazi.', nullable: true })
  popaf_gnomade_asj?: number | null;

  @Field(() => Float, { description: 'gnomAD exome East Asian.', nullable: true })
  popaf_gnomade_eas?: number | null;

  @Field(() => Float, { description: 'gnomAD exome Finnish.', nullable: true })
  popaf_gnomade_fin?: number | null;

  @Field(() => Float, { description: 'gnomAD exome non-Finnish European.', nullable: true })
  popaf_gnomade_nfe?: number | null;

  @Field(() => Float, { description: 'gnomAD exome other.', nullable: true })
  popaf_gnomade_oth?: number | null;

  @Field(() => Float, { description: 'gnomAD exome South Asian.', nullable: true })
  popaf_gnomade_sas?: number | null;

  @Field(() => Float, { description: 'gnomAD genome combined.', nullable: true })
  popaf_gnomadg?: number | null;

  @Field(() => Float, { description: 'gnomAD genome African.', nullable: true })
  popaf_gnomadg_afr?: number | null;

  @Field(() => Float, { description: 'gnomAD genome Amish.', nullable: true })
  popaf_gnomadg_ami?: number | null;

  @Field(() => Float, { description: 'gnomAD genome Latino.', nullable: true })
  popaf_gnomadg_amr?: number | null;

  @Field(() => Float, { description: 'gnomAD genome Ashkenazi.', nullable: true })
  popaf_gnomadg_asj?: number | null;

  @Field(() => Float, { description: 'gnomAD genome East Asian.', nullable: true })
  popaf_gnomadg_eas?: number | null;

  @Field(() => Float, { description: 'gnomAD genome Finnish.', nullable: true })
  popaf_gnomadg_fin?: number | null;

  @Field(() => Float, { description: 'gnomAD genome Mid-eastern.', nullable: true })
  popaf_gnomadg_mid?: number | null;

  @Field(() => Float, { description: 'gnomAD genome non-Finnish European.', nullable: true })
  popaf_gnomadg_nfe?: number | null;

  @Field(() => Float, { description: 'gnomAD genome other.', nullable: true })
  popaf_gnomadg_oth?: number | null;

  @Field(() => Float, { description: 'gnomAD genome South Asian.', nullable: true })
  popaf_gnomadg_sas?: number | null;

  @Field(() => String, { description: 'gnomAD SV evidence.', nullable: true })
  popaf_gnomad_sv_evidence?: string | null;

  @Field(() => String, { description: 'gnomAD SV type.', nullable: true })
  popaf_gnomad_sv_svtype?: string | null;

  @Field(() => String, { description: 'gnomAD SV allele frequency.', nullable: true })
  popaf_gnomad_sv_af?: string | null;

  @Field(() => Float, { description: 'gnomAD mito allele count homoplasmy.', nullable: true })
  popaf_gnomad_mito_ac_hom?: number | null;

  @Field(() => Float, { description: 'gnomAD mito allele freq homoplasmy.', nullable: true })
  popaf_gnomad_mito_af_hom?: number | null;

  @Field(() => Float, { description: 'gnomAD mito allele count heteroplasmy.', nullable: true })
  popaf_gnomad_mito_ac_het?: number | null;

  @Field(() => Float, { description: 'gnomAD mito allele freq heteroplasmy.', nullable: true })
  popaf_gnomad_mito_af_het?: number | null;

  @Field(() => String, { description: 'ExAC allele frequency.', nullable: true })
  popaf_exac_af?: string | null;

  @Field(() => String, { description: 'ExAC total allele number.', nullable: true })
  popaf_exac_an?: string | null;

  @Field(() => String, { description: 'ExAC ALT count.', nullable: true })
  popaf_exac_ac?: string | null;

  @Field(() => String, { description: 'ExAC hemizygous count.', nullable: true })
  popaf_exac_ac_hemi?: string | null;

  @Field(() => String, { description: 'ExAC heterozygous count.', nullable: true })
  popaf_exac_ac_het?: string | null;

  @Field(() => String, { description: 'ExAC homozygous count.', nullable: true })
  popaf_exac_ac_homo?: string | null;

  @Field(() => String, { description: 'gnomAD coordinate string.', nullable: true })
  popaf_gnomad_id?: string | null;

  @Field(() => String, { description: 'gnomAD link.', nullable: true })
  popaf_gnomad_id_url?: string | null;

  @Field(() => Float, { description: 'pLI gene loss-of-function tolerance.', nullable: true })
  popaf_pli_gene_score?: number | null;

  @Field(() => String, { description: 'Ensembl stable gene id.', nullable: true })
  gene_ensembl_gene?: string | null;

  @Field(() => String, { description: 'Gene symbol.', nullable: true })
  gene_symbol?: string | null;

  @Field(() => String, { description: 'Gene symbol source.', nullable: true })
  gene_symbol_source?: string | null;

  @Field(() => String, { description: 'HGNC gene id.', nullable: true })
  gene_hgnc_id?: string | null;

  @Field(() => String, { description: 'HGNC link.', nullable: true })
  gene_hgnc_id_url?: string | null;

  @Field(() => String, { description: 'RefSeq consequence (VEP).', nullable: true })
  feat_consequence?: string | null;

  @Field(() => String, { description: 'Ensembl consequence (VEP).', nullable: true })
  feat_ens_consequence?: string | null;

  @Field(() => String, { description: 'SO variant class.', nullable: true })
  feat_variant_class?: string | null;

  @Field(() => String, { description: 'RefSeq transcript id.', nullable: true })
  feat_feature?: string | null;

  @Field(() => String, { description: 'RefSeq transcript link.', nullable: true })
  feat_feature_url?: string | null;

  @Field(() => String, { description: 'RefSeq feature type.', nullable: true })
  feat_feature_type?: string | null;

  @Field(() => String, { description: 'RefSeq canonical flag.', nullable: true })
  feat_canonical?: string | null;

  @Field(() => String, { description: 'Genomic strand.', nullable: true })
  feat_strand?: string | null;

  @Field(() => String, { description: 'Ensembl HGVSc.', nullable: true })
  feat_ens_hgvsc?: string | null;

  @Field(() => String, { description: 'RefSeq HGVSc.', nullable: true })
  feat_hgvsc?: string | null;

  @Field(() => String, { description: 'Ensembl HGVSp.', nullable: true })
  feat_ens_hgvsp?: string | null;

  @Field(() => String, { description: 'HGVS genomic.', nullable: true })
  feat_hgvsg?: string | null;

  @Field(() => String, { description: 'HGVS offset.', nullable: true })
  feat_hgvs_offset?: string | null;

  @Field(() => String, { description: 'SPDI notation.', nullable: true })
  feat_spdi?: string | null;

  @Field(() => String, { description: 'GA4GH VRS.', nullable: true })
  feat_vrs?: string | null;

  @Field(() => String, { description: 'Consequence impact modifier.', nullable: true })
  feat_impact?: string | null;

  @Field(() => String, { description: 'Transcript/regulatory biotype.', nullable: true })
  feat_biotype?: string | null;

  @Field(() => String, { description: 'Ensembl exon number.', nullable: true })
  feat_ens_exon?: string | null;

  @Field(() => String, { description: 'Ensembl intron number.', nullable: true })
  feat_ens_intron?: string | null;

  @Field(() => String, { description: 'Ensembl cDNA position.', nullable: true })
  feat_ens_cdna_position?: string | null;

  @Field(() => String, { description: 'Ensembl CDS position.', nullable: true })
  feat_ens_cds_position?: string | null;

  @Field(() => String, { description: 'Ensembl protein position.', nullable: true })
  feat_ens_protein_position?: string | null;

  @Field(() => String, { description: 'Reference/variant amino acids.', nullable: true })
  feat_amino_acids?: string | null;

  @Field(() => String, { description: 'Reference/variant codons.', nullable: true })
  feat_codons?: string | null;

  @Field(() => String, { description: 'Distance variant→transcript.', nullable: true })
  feat_distance?: string | null;

  @Field(() => String, { description: 'Transcript quality flags.', nullable: true })
  feat_flags?: string | null;

  @Field(() => String, { description: 'PubMed ids.', nullable: true })
  feat_pubmed?: string | null;

  @Field(() => [String], { description: 'PubMed links.', nullable: true })
  feat_pubmed_url?: string[] | null;

  @Field(() => String, { description: 'Custom annotations.', nullable: true })
  feat_custom_annotation?: string | null;

  @Field(() => String, { description: 'Ensembl stable feature id.', nullable: true })
  feat_ens_feature?: string | null;

  @Field(() => String, { description: 'Ensembl feature link.', nullable: true })
  feat_ens_feature_url?: string | null;

  @Field(() => String, { description: 'Ensembl feature type.', nullable: true })
  feat_ens_feature_type?: string | null;

  @Field(() => String, { description: 'Ensembl canonical flag.', nullable: true })
  feat_ens_canonical?: string | null;

  @Field(() => String, { description: 'RefSeq HGVSp.', nullable: true })
  feat_hgvsp?: string | null;

  @Field(() => String, { description: 'RefSeq exon number.', nullable: true })
  feat_exon?: string | null;

  @Field(() => String, { description: 'RefSeq intron number.', nullable: true })
  feat_intron?: string | null;

  @Field(() => String, { description: 'RefSeq cDNA position.', nullable: true })
  feat_cdna_position?: string | null;

  @Field(() => String, { description: 'RefSeq CDS position.', nullable: true })
  feat_cds_position?: string | null;

  @Field(() => String, { description: 'RefSeq protein position.', nullable: true })
  feat_protein_position?: string | null;

  @Field(() => String, { description: 'Target gene.', nullable: true })
  feat_target_gene?: string | null;

  @Field(() => String, { description: 'OMIM gene id.', nullable: true })
  extdb_omim_id?: string | null;

  @Field(() => [String], { description: 'OMIM links.', nullable: true })
  extdb_omim_id_url?: string[] | null;

  @Field(() => String, { description: 'SwissProt accessions.', nullable: true })
  extdb_swissprot?: string | null;

  @Field(() => String, { description: 'TrEMBL accessions.', nullable: true })
  extdb_trembl?: string | null;

  @Field(() => String, { description: 'UniParc accessions.', nullable: true })
  extdb_uniparc?: string | null;

  @Field(() => String, { description: 'UniProt isoform accessions.', nullable: true })
  extdb_uniprot_isoform?: string | null;

  @Field(() => String, { description: 'Orphanet gene id.', nullable: true })
  extdb_orphanet?: string | null;

  @Field(() => [String], { description: 'Orphanet links.', nullable: true })
  extdb_orphanet_url?: string[] | null;

  @Field(() => String, { description: 'GO terms associated.', nullable: true })
  extdb_go?: string | null;

  @Field(() => String, { description: 'LOVD variant matching.', nullable: true })
  extdb_lovd?: string | null;

  @Field(() => String, { description: 'GTEx mapping.', nullable: true })
  extdb_gtex?: string | null;

  @Field(() => String, { description: 'GTEx link.', nullable: true })
  extdb_gtex_url?: string | null;

  @Field(() => String, { description: 'Drug — CPIC level.', nullable: true })
  extdb_cpic?: string | null;
}

@ObjectType({ description: 'A page of current variants.' })
export class VariantPageObject {
  @Field(() => [VariantObject], { description: 'The matching current variants.' })
  items!: VariantObject[];

  @Field(() => String, {
    nullable: true,
    description: 'Opaque cursor for the next page; null on the last one.',
  })
  next_cursor!: string | null;
}
