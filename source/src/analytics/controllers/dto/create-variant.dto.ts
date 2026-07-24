import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { NewVariant, VariantOrigin, VariantType } from '../../domain/variant';

/**
 * Request body for inserting a variant (analytics::variant::create). Implements the
 * domain `NewVariant` shape; `id` and `created_at` are system-generated and not
 * accepted from input. Required fields per the descriptor: project_id, uri, origin,
 * type, collection.
 */
export class CreateVariantDto implements NewVariant {
  @ApiProperty()
  @IsInt()
  project_id!: number;

  @ApiProperty()
  @IsString()
  uri!: string;

  @ApiProperty()
  @IsIn(['GERMLINE', 'SOMATIC', 'TRIO', 'PGx'])
  origin!: VariantOrigin;

  @ApiProperty()
  @IsIn(['SNV/INDEL', 'SV', 'CNV'])
  type!: VariantType;

  @ApiProperty()
  @IsString()
  collection!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hpo?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  allele_frequency?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  user_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  annotation_version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trio_variant_category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trio_category_tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ind1_zygosity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ind1_vaf?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ind1_dp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ind2_zygosity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ind2_vaf?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ind2_dp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ind3_zygosity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ind3_vaf?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ind3_dp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pos_genome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pos_chr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pos_position?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pos_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pos_sv_end?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pos_sv_len?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pos_sb?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pos_seg_dup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pos_chrom_band?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pos_microsat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_allele_ref?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_allele_alt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_allele_num?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_allele?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_calc_genotype?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_zyg?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_aa?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_ac?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_af?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gt_an?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_cigar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_db?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_end?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_h2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_h3?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_format_gt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_format_ft?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_format_gl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_format_gle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_format_pl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gt_format_gp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gt_format_gq?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_format_hq?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gt_format_ps?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gt_format_pq?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_format_ec?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gt_format_mq?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gt_technique?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  call_filter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_quality?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_read_depth_ref?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_read_pct_ref?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_read_depth_alt?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_read_pct_alt?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_read_depth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_bq?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_dp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_mq?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_mq0?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  call_ns?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_format_dp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  call_sv_cipos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  call_sv_ciend?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  call_sv_cilen?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_sv_dp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  call_sv_dpadj?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_fold_change?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  call_roq?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exist_existing_variation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exist_somatic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exist_clin_sig?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exist_pheno?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exist_dbsnp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exist_cosmic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exist_hgmd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exist_others?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exist_dbsnp_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exist_dbsnp_rs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exist_dbsnp_rs_url?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exist_dbsnp_ssr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exist_ensdgv?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_clinvar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_clinvar_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clin_clinvar_clnsig?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_clinvar_clnsig_str?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_clinvar_clnrevstat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_clinvar_clndn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_clinvar_clnsigconf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_acmg?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_gene_pheno?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_clinvar_cnv?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_dbvar_path_dup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_dbvar_path_del?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_civic_variant_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_civic_mp_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_civic_mp_score?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_civic_entity_significance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_civic_entity_disease?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_civic_entity_therapies?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_clngen_cat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_clngen_met?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_clngen_not_met?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_intogen?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_cv_score?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_cv_classification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_medgen_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_medgen_disease?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clin_medgen_disease_url?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_franklin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_franklin_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clin_disease_omim_orphanet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_sift_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_enspolyphen_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_revel_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_refpolyphen_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_lrt_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_mutationtaster_score?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_mutationassessor_score?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_fathmm_score?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_fathmm_mkl_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_metasvm_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_metalr_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_gerp_rs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_phylop_mammalian?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_siphy_29way?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_cadd_raw?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_dann_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_eigen_raw_coding?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_genocanyon_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_ada_score?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_rf_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_alphamissense_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_alphamissense_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_bayesdel_addaf_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_bayesdel_addaf_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_bayesdel_noaf_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_cadd_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_cadd_phred_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_carol_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_carol_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_clinpred_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_clinpred_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_dann_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_eve_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_eve_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_loftool_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_metalr_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_metarnn_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_metarnn_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_polyphen_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_primateai_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_primateai_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_revel_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_sift_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_spadahc_sum?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_spliceai_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_spliceai_ag?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_spliceai_al?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_spliceai_dg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_spliceai_dl?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_vest4_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_vest4_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_gerp_prediction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_exomiser_variant_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_spliceai_ds_ag?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_spliceai_ds_al?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_spliceai_ds_dg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_spliceai_ds_dl?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_spliceai_dp_ag?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_spliceai_dp_al?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_spliceai_dp_dg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pred_spliceai_dp_dl?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_mitomap_mtscore?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pred_mitomap_quartile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_max_af?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  popaf_max_af_pops?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_1kg_all?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_1kg_afr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_1kg_amr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_1kg_eas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_1kg_eur?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_1kg_sas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomade?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomade_afr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomade_amr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomade_asj?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomade_eas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomade_fin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomade_nfe?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomade_oth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomade_sas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomadg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_afr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_ami?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_amr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_asj?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_eas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_fin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_mid?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_nfe?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_oth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomadg_sas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  popaf_gnomad_sv_evidence?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  popaf_gnomad_sv_svtype?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  popaf_gnomad_sv_af?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomad_mito_ac_hom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomad_mito_af_hom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomad_mito_ac_het?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_gnomad_mito_af_het?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  popaf_exac_af?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  popaf_exac_an?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  popaf_exac_ac?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  popaf_exac_ac_hemi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  popaf_exac_ac_het?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  popaf_exac_ac_homo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  popaf_gnomad_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  popaf_gnomad_id_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  popaf_pli_gene_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gene_ensembl_gene?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gene_symbol?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gene_symbol_source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gene_hgnc_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gene_hgnc_id_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_consequence?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_ens_consequence?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_variant_class?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_feature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_feature_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_feature_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_canonical?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_strand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_ens_hgvsc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_hgvsc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_ens_hgvsp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_hgvsg?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_hgvs_offset?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_spdi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_vrs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_impact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_biotype?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_ens_exon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_ens_intron?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_ens_cdna_position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_ens_cds_position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_ens_protein_position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_amino_acids?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_codons?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_distance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_flags?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_pubmed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  feat_pubmed_url?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_custom_annotation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_ens_feature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_ens_feature_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_ens_feature_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_ens_canonical?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_hgvsp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_exon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_intron?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_cdna_position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_cds_position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_protein_position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feat_target_gene?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extdb_omim_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extdb_omim_id_url?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extdb_swissprot?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extdb_trembl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extdb_uniparc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extdb_uniprot_isoform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extdb_orphanet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extdb_orphanet_url?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extdb_go?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extdb_lovd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extdb_gtex?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extdb_gtex_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extdb_cpic?: string;

}
