/**
 * The variant domain entity — an annotated genomic variant.
 *
 * Transcribed from `.inspire_kb/04_domain/analytics/variant/analytics.variant.md`;
 * the field shape mirrors the upstream annotation document one-to-one, flattened into
 * prefixed columns per adr-clickhouse-primary-database. Pure types: no framework
 * imports, no storage concerns.
 */

/** Variant origin. */
export enum VariantOrigin {
  GERMLINE = 'GERMLINE',
  SOMATIC = 'SOMATIC',
  TRIO = 'TRIO',
  PGx = 'PGx',
}

/** Variant type. */
export enum VariantType {
  SNV_INDEL = 'SNV/INDEL',
  SV = 'SV',
  CNV = 'CNV',
}

/**
 * The fields a caller must always supply. `(project_id, collection, uri)` is the
 * natural key; `version_date` is the caller-supplied logical version.
 */
export interface VariantRequiredFields {
  /** Project scope; supplied by the caller. Part of the natural key. */
  project_id: number;
  /** Caller-supplied logical version; greatest per natural key is current. */
  version_date: Date;
  /** Variant URI. Part of the natural key. */
  uri: string;
  /** Enum: GERMLINE · SOMATIC · TRIO · PGx. */
  origin: VariantOrigin;
  /** Enum: SNV/INDEL · SV · CNV. */
  type: VariantType;
  /** Source collection. Part of the natural key. */
  collection: string;
}

/** Every other variant field. All optional on input. */
export interface VariantOptionalFields {
  /** HPO codes. */
  hpo?: string[];
  /** Variant score. */
  score?: number | null;
  /** Allele frequency. */
  allele_frequency?: number | null;
  /** Source user id. */
  user_id?: number | null;
  /** Annotation pipeline version. */
  annotation_version?: string | null;
  /** Segregation variant category (enum). */
  trio_variant_category?: string | null;
  /** Zygosity-combination tag (enum). */
  trio_category_tag?: string | null;
  /** Zygosity ind.I (proband): HOM/HET/REF/NO-COV. */
  ind1_zygosity?: string | null;
  /** VAF (%) ind.I. */
  ind1_vaf?: number | null;
  /** Read depth ind.I. */
  ind1_dp?: number | null;
  /** Zygosity ind.II (father). */
  ind2_zygosity?: string | null;
  /** VAF (%) ind.II. */
  ind2_vaf?: number | null;
  /** Read depth ind.II. */
  ind2_dp?: number | null;
  /** Zygosity ind.III (mother). */
  ind3_zygosity?: string | null;
  /** VAF (%) ind.III. */
  ind3_vaf?: number | null;
  /** Read depth ind.III. */
  ind3_dp?: number | null;
  /** Reference genome (required within the optional position block). */
  pos_genome?: string | null;
  /** Chromosome (required within the optional position block). */
  pos_chr?: string | null;
  /** Position (required within the optional position block). */
  pos_position?: number | null;
  /** Identifier. */
  pos_id?: string | null;
  /** SV end position. */
  pos_sv_end?: number | null;
  /** SV length. */
  pos_sv_len?: number | null;
  /** Strand bias. */
  pos_sb?: string | null;
  /** Segmental-duplication overlap. */
  pos_seg_dup?: string | null;
  /** Chromosomal band. */
  pos_chrom_band?: string | null;
  /** Overlapping microsatellites id. */
  pos_microsat?: string | null;
  /** REF allele base(s). */
  gt_allele_ref?: string | null;
  /** ALT allele base(s). */
  gt_allele_alt?: string | null;
  /** Allele number from VCF. */
  gt_allele_num?: string | null;
  /** Allele used for consequence. */
  gt_allele?: string | null;
  /** Computed genotype. */
  gt_calc_genotype?: string | null;
  /** Zygosity: HOM/HET/HEM. */
  gt_zyg?: string | null;
  /** Ancestral allele. */
  gt_aa?: string | null;
  /** Allele count. */
  gt_ac?: string | null;
  /** Allele frequency (per ALT). */
  gt_af?: string | null;
  /** Total alleles in called genotypes. */
  gt_an?: number | null;
  /** CIGAR string. */
  gt_cigar?: string | null;
  /** dbSNP membership. */
  gt_db?: string | null;
  /** End position (symbolic alleles). */
  gt_end?: string | null;
  /** HapMap2 membership. */
  gt_h2?: string | null;
  /** HapMap3 membership. */
  gt_h3?: string | null;
  /** FORMAT genotype. */
  gt_format_gt?: string | null;
  /** Sample genotype filter. */
  gt_format_ft?: string | null;
  /** Genotype likelihoods. */
  gt_format_gl?: string | null;
  /** Genotype likelihoods (heterogeneous ploidy). */
  gt_format_gle?: string | null;
  /** Phred-scaled genotype likelihoods. */
  gt_format_pl?: string | null;
  /** Phred-scaled genotype posteriors. */
  gt_format_gp?: number | null;
  /** Conditional genotype quality. */
  gt_format_gq?: number | null;
  /** Haplotype qualities. */
  gt_format_hq?: string | null;
  /** Phase set. */
  gt_format_ps?: number | null;
  /** Phasing quality. */
  gt_format_pq?: number | null;
  /** Expected alt allele counts. */
  gt_format_ec?: string | null;
  /** RMS mapping quality (FORMAT). */
  gt_format_mq?: number | null;
  /** Characterization technique (enum). */
  gt_technique?: string | null;
  /** Filter status. */
  call_filter?: string | null;
  /** Phred-scaled quality in ALT. */
  call_quality?: number | null;
  /** Number of REF reads. */
  call_read_depth_ref?: number | null;
  /** % REF reads. */
  call_read_pct_ref?: number | null;
  /** Number of ALT reads. */
  call_read_depth_alt?: number | null;
  /** % ALT reads. */
  call_read_pct_alt?: number | null;
  /** Total read depth. */
  call_read_depth?: number | null;
  /** RMS base quality. */
  call_bq?: number | null;
  /** Combined depth across samples. */
  call_dp?: number | null;
  /** RMS mapping quality (INFO). */
  call_mq?: number | null;
  /** MAPQ==0 reads covering record. */
  call_mq0?: number | null;
  /** Samples with data. */
  call_ns?: string | null;
  /** Sample read depth. */
  call_format_dp?: number | null;
  /** SV CI around POS. */
  call_sv_cipos?: string | null;
  /** SV CI around END. */
  call_sv_ciend?: string | null;
  /** SV CI around inserted length. */
  call_sv_cilen?: string | null;
  /** SV read depth of breakend segment. */
  call_sv_dp?: number | null;
  /** SV read depth of adjacency. */
  call_sv_dpadj?: string | null;
  /** CNV fold change. */
  call_fold_change?: number | null;
  /** Read-orientation quality. */
  call_roq?: number | null;
  /** Known co-located variants. */
  exist_existing_variation?: string | null;
  /** Somatic status of existing variants. */
  exist_somatic?: string | null;
  /** Allele-specific clinical significance. */
  exist_clin_sig?: string | null;
  /** Phenotype membership. */
  exist_pheno?: string | null;
  /** dbSNP overlapping variant(s). */
  exist_dbsnp?: string | null;
  /** COSMIC overlapping variant(s). */
  exist_cosmic?: string | null;
  /** HGMD overlapping variant(s). */
  exist_hgmd?: string | null;
  /** Other overlapping variant(s). */
  exist_others?: string | null;
  /** dbSNP id (rsname). */
  exist_dbsnp_id?: string | null;
  /** dbSNP rs number. */
  exist_dbsnp_rs?: string | null;
  /** dbSNP rs links. */
  exist_dbsnp_rs_url?: string[];
  /** Variant suspect reason codes. */
  exist_dbsnp_ssr?: string | null;
  /** DGV variants inside this SV. */
  exist_ensdgv?: string | null;
  /** ClinVar variation id. */
  clin_clinvar?: string | null;
  /** ClinVar variation link. */
  clin_clinvar_url?: string | null;
  /** ClinVar clinical significance. */
  clin_clinvar_clnsig?: string[];
  /** ClinVar clinical significance (string). */
  clin_clinvar_clnsig_str?: string | null;
  /** ClinVar review status. */
  clin_clinvar_clnrevstat?: string | null;
  /** ClinVar preferred disease name. */
  clin_clinvar_clndn?: string | null;
  /** ClinVar conflicting significance. */
  clin_clinvar_clnsigconf?: string | null;
  /** ACMG classification prediction (enum). */
  clin_acmg?: string | null;
  /** Gene phenotype association flag. */
  clin_gene_pheno?: string | null;
  /** ClinVar CNV id. */
  clin_clinvar_cnv?: string | null;
  /** dbVar pathogenic duplication overlap. */
  clin_dbvar_path_dup?: string | null;
  /** dbVar pathogenic deletion overlap. */
  clin_dbvar_path_del?: string | null;
  /** CIViC variant id. */
  clin_civic_variant_id?: string | null;
  /** CIViC molecular profile name. */
  clin_civic_mp_name?: string | null;
  /** CIViC molecular profile score. */
  clin_civic_mp_score?: string | null;
  /** CIViC entity significance. */
  clin_civic_entity_significance?: string | null;
  /** CIViC entity disease. */
  clin_civic_entity_disease?: string | null;
  /** CIViC entity therapies. */
  clin_civic_entity_therapies?: string | null;
  /** ClinGen clinical classification. */
  clin_clngen_cat?: string | null;
  /** ClinGen ACMG criteria confirmed. */
  clin_clngen_met?: string | null;
  /** ClinGen ACMG criteria excluded. */
  clin_clngen_not_met?: string | null;
  /** Intogen cancer driver association. */
  clin_intogen?: string | null;
  /** CancerVar score. */
  clin_cv_score?: string | null;
  /** CancerVar AMP/ASCO/CAP classification. */
  clin_cv_classification?: string | null;
  /** MedGen id. */
  clin_medgen_id?: string | null;
  /** MedGen disease associated. */
  clin_medgen_disease?: string | null;
  /** MedGen disease links. */
  clin_medgen_disease_url?: string[];
  /** Franklin search tag. */
  clin_franklin?: string | null;
  /** Franklin search link. */
  clin_franklin_url?: string | null;
  /** OMIM/ORPHANET disease ids. */
  clin_disease_omim_orphanet?: string | null;
  /** SIFT prediction. */
  pred_sift_prediction?: string | null;
  /** PolyPhen HVar prediction. */
  pred_enspolyphen_prediction?: string | null;
  /** REVEL prediction. */
  pred_revel_prediction?: string | null;
  /** PolyPhen HDIV prediction. */
  pred_refpolyphen_prediction?: string | null;
  /** LRT score. */
  pred_lrt_score?: number | null;
  /** MutationTaster score. */
  pred_mutationtaster_score?: string | null;
  /** MutationAssessor score. */
  pred_mutationassessor_score?: string | null;
  /** FATHMM score. */
  pred_fathmm_score?: string | null;
  /** FATHMM-MKL score. */
  pred_fathmm_mkl_score?: number | null;
  /** MetaSVM score. */
  pred_metasvm_score?: number | null;
  /** MetaLR score. */
  pred_metalr_score?: number | null;
  /** GERP++ score. */
  pred_gerp_rs?: number | null;
  /** phyloP mammalian score. */
  pred_phylop_mammalian?: number | null;
  /** SiPhy 29-way logOdds score. */
  pred_siphy_29way?: number | null;
  /** CADD raw score. */
  pred_cadd_raw?: number | null;
  /** DANN score. */
  pred_dann_score?: number | null;
  /** Eigen raw score. */
  pred_eigen_raw_coding?: number | null;
  /** GenoCanyon score. */
  pred_genocanyon_score?: number | null;
  /** dbscSNV ADA score. */
  pred_ada_score?: string | null;
  /** dbscSNV RF score. */
  pred_rf_score?: number | null;
  /** AlphaMissense prediction. */
  pred_alphamissense_prediction?: string | null;
  /** AlphaMissense score. */
  pred_alphamissense_score?: number | null;
  /** BayesDel addAF prediction. */
  pred_bayesdel_addaf_prediction?: string | null;
  /** BayesDel addAF score. */
  pred_bayesdel_addaf_score?: number | null;
  /** BayesDel noAF prediction. */
  pred_bayesdel_noaf_prediction?: string | null;
  /** CADD prediction. */
  pred_cadd_prediction?: string | null;
  /** CADD PHRED score. */
  pred_cadd_phred_score?: number | null;
  /** CAROL prediction. */
  pred_carol_prediction?: string | null;
  /** CAROL score. */
  pred_carol_score?: number | null;
  /** ClinPred prediction. */
  pred_clinpred_prediction?: string | null;
  /** ClinPred score. */
  pred_clinpred_score?: number | null;
  /** DANN prediction. */
  pred_dann_prediction?: string | null;
  /** EVE prediction. */
  pred_eve_prediction?: string | null;
  /** EVE score. */
  pred_eve_score?: number | null;
  /** LoFtool gene score. */
  pred_loftool_score?: number | null;
  /** MetaLR prediction. */
  pred_metalr_prediction?: string | null;
  /** MetaRNN prediction. */
  pred_metarnn_prediction?: string | null;
  /** MetaRNN score. */
  pred_metarnn_score?: number | null;
  /** PolyPhen score. */
  pred_polyphen_score?: number | null;
  /** PrimateAI prediction. */
  pred_primateai_prediction?: string | null;
  /** PrimateAI score. */
  pred_primateai_score?: number | null;
  /** REVEL score. */
  pred_revel_score?: number | null;
  /** SIFT score. */
  pred_sift_score?: number | null;
  /** SpadaHC summary. */
  pred_spadahc_sum?: string | null;
  /** SpliceAI prediction. */
  pred_spliceai_prediction?: string | null;
  /** SpliceAI score AG. */
  pred_spliceai_ag?: number | null;
  /** SpliceAI score AL. */
  pred_spliceai_al?: number | null;
  /** SpliceAI score DG. */
  pred_spliceai_dg?: number | null;
  /** SpliceAI score DL. */
  pred_spliceai_dl?: number | null;
  /** VEST4 prediction. */
  pred_vest4_prediction?: string | null;
  /** VEST4 score. */
  pred_vest4_score?: number | null;
  /** GERP++ prediction. */
  pred_gerp_prediction?: string | null;
  /** Exomiser phenotypic variant score. */
  pred_exomiser_variant_score?: number | null;
  /** SpliceAI delta score acceptor gain. */
  pred_spliceai_ds_ag?: number | null;
  /** SpliceAI delta score acceptor loss. */
  pred_spliceai_ds_al?: number | null;
  /** SpliceAI delta score donor gain. */
  pred_spliceai_ds_dg?: number | null;
  /** SpliceAI delta score donor loss. */
  pred_spliceai_ds_dl?: number | null;
  /** SpliceAI delta position acceptor gain. */
  pred_spliceai_dp_ag?: number | null;
  /** SpliceAI delta position acceptor loss. */
  pred_spliceai_dp_al?: number | null;
  /** SpliceAI delta position donor gain. */
  pred_spliceai_dp_dg?: number | null;
  /** SpliceAI delta position donor loss. */
  pred_spliceai_dp_dl?: number | null;
  /** MitoMap score interpretation. */
  pred_mitomap_mtscore?: string | null;
  /** MitoMap quartile of raw scores. */
  pred_mitomap_quartile?: string | null;
  /** Highest AF in any population. */
  popaf_max_af?: number | null;
  /** Max-AF source population. */
  popaf_max_af_pops?: string | null;
  /** 1000G global. */
  popaf_1kg_all?: number | null;
  /** 1000G African. */
  popaf_1kg_afr?: number | null;
  /** 1000G American. */
  popaf_1kg_amr?: number | null;
  /** 1000G East Asian. */
  popaf_1kg_eas?: number | null;
  /** 1000G European. */
  popaf_1kg_eur?: number | null;
  /** 1000G South Asian. */
  popaf_1kg_sas?: number | null;
  /** gnomAD exome combined. */
  popaf_gnomade?: number | null;
  /** gnomAD exome African. */
  popaf_gnomade_afr?: number | null;
  /** gnomAD exome Latino. */
  popaf_gnomade_amr?: number | null;
  /** gnomAD exome Ashkenazi. */
  popaf_gnomade_asj?: number | null;
  /** gnomAD exome East Asian. */
  popaf_gnomade_eas?: number | null;
  /** gnomAD exome Finnish. */
  popaf_gnomade_fin?: number | null;
  /** gnomAD exome non-Finnish European. */
  popaf_gnomade_nfe?: number | null;
  /** gnomAD exome other. */
  popaf_gnomade_oth?: number | null;
  /** gnomAD exome South Asian. */
  popaf_gnomade_sas?: number | null;
  /** gnomAD genome combined. */
  popaf_gnomadg?: number | null;
  /** gnomAD genome African. */
  popaf_gnomadg_afr?: number | null;
  /** gnomAD genome Amish. */
  popaf_gnomadg_ami?: number | null;
  /** gnomAD genome Latino. */
  popaf_gnomadg_amr?: number | null;
  /** gnomAD genome Ashkenazi. */
  popaf_gnomadg_asj?: number | null;
  /** gnomAD genome East Asian. */
  popaf_gnomadg_eas?: number | null;
  /** gnomAD genome Finnish. */
  popaf_gnomadg_fin?: number | null;
  /** gnomAD genome Mid-eastern. */
  popaf_gnomadg_mid?: number | null;
  /** gnomAD genome non-Finnish European. */
  popaf_gnomadg_nfe?: number | null;
  /** gnomAD genome other. */
  popaf_gnomadg_oth?: number | null;
  /** gnomAD genome South Asian. */
  popaf_gnomadg_sas?: number | null;
  /** gnomAD SV evidence. */
  popaf_gnomad_sv_evidence?: string | null;
  /** gnomAD SV type. */
  popaf_gnomad_sv_svtype?: string | null;
  /** gnomAD SV allele frequency. */
  popaf_gnomad_sv_af?: string | null;
  /** gnomAD mito allele count homoplasmy. */
  popaf_gnomad_mito_ac_hom?: number | null;
  /** gnomAD mito allele freq homoplasmy. */
  popaf_gnomad_mito_af_hom?: number | null;
  /** gnomAD mito allele count heteroplasmy. */
  popaf_gnomad_mito_ac_het?: number | null;
  /** gnomAD mito allele freq heteroplasmy. */
  popaf_gnomad_mito_af_het?: number | null;
  /** ExAC allele frequency. */
  popaf_exac_af?: string | null;
  /** ExAC total allele number. */
  popaf_exac_an?: string | null;
  /** ExAC ALT count. */
  popaf_exac_ac?: string | null;
  /** ExAC hemizygous count. */
  popaf_exac_ac_hemi?: string | null;
  /** ExAC heterozygous count. */
  popaf_exac_ac_het?: string | null;
  /** ExAC homozygous count. */
  popaf_exac_ac_homo?: string | null;
  /** gnomAD coordinate string. */
  popaf_gnomad_id?: string | null;
  /** gnomAD link. */
  popaf_gnomad_id_url?: string | null;
  /** pLI gene loss-of-function tolerance. */
  popaf_pli_gene_score?: number | null;
  /** Ensembl stable gene id. */
  gene_ensembl_gene?: string | null;
  /** Gene symbol. */
  gene_symbol?: string | null;
  /** Gene symbol source. */
  gene_symbol_source?: string | null;
  /** HGNC gene id. */
  gene_hgnc_id?: string | null;
  /** HGNC link. */
  gene_hgnc_id_url?: string | null;
  /** RefSeq consequence (VEP). */
  feat_consequence?: string | null;
  /** Ensembl consequence (VEP). */
  feat_ens_consequence?: string | null;
  /** SO variant class. */
  feat_variant_class?: string | null;
  /** RefSeq transcript id. */
  feat_feature?: string | null;
  /** RefSeq transcript link. */
  feat_feature_url?: string | null;
  /** RefSeq feature type. */
  feat_feature_type?: string | null;
  /** RefSeq canonical flag. */
  feat_canonical?: string | null;
  /** Genomic strand. */
  feat_strand?: string | null;
  /** Ensembl HGVSc. */
  feat_ens_hgvsc?: string | null;
  /** RefSeq HGVSc. */
  feat_hgvsc?: string | null;
  /** Ensembl HGVSp. */
  feat_ens_hgvsp?: string | null;
  /** HGVS genomic. */
  feat_hgvsg?: string | null;
  /** HGVS offset. */
  feat_hgvs_offset?: string | null;
  /** SPDI notation. */
  feat_spdi?: string | null;
  /** GA4GH VRS. */
  feat_vrs?: string | null;
  /** Consequence impact modifier. */
  feat_impact?: string | null;
  /** Transcript/regulatory biotype. */
  feat_biotype?: string | null;
  /** Ensembl exon number. */
  feat_ens_exon?: string | null;
  /** Ensembl intron number. */
  feat_ens_intron?: string | null;
  /** Ensembl cDNA position. */
  feat_ens_cdna_position?: string | null;
  /** Ensembl CDS position. */
  feat_ens_cds_position?: string | null;
  /** Ensembl protein position. */
  feat_ens_protein_position?: string | null;
  /** Reference/variant amino acids. */
  feat_amino_acids?: string | null;
  /** Reference/variant codons. */
  feat_codons?: string | null;
  /** Distance variant→transcript. */
  feat_distance?: string | null;
  /** Transcript quality flags. */
  feat_flags?: string | null;
  /** PubMed ids. */
  feat_pubmed?: string | null;
  /** PubMed links. */
  feat_pubmed_url?: string[];
  /** Custom annotations. */
  feat_custom_annotation?: string | null;
  /** Ensembl stable feature id. */
  feat_ens_feature?: string | null;
  /** Ensembl feature link. */
  feat_ens_feature_url?: string | null;
  /** Ensembl feature type. */
  feat_ens_feature_type?: string | null;
  /** Ensembl canonical flag. */
  feat_ens_canonical?: string | null;
  /** RefSeq HGVSp. */
  feat_hgvsp?: string | null;
  /** RefSeq exon number. */
  feat_exon?: string | null;
  /** RefSeq intron number. */
  feat_intron?: string | null;
  /** RefSeq cDNA position. */
  feat_cdna_position?: string | null;
  /** RefSeq CDS position. */
  feat_cds_position?: string | null;
  /** RefSeq protein position. */
  feat_protein_position?: string | null;
  /** Target gene. */
  feat_target_gene?: string | null;
  /** OMIM gene id. */
  extdb_omim_id?: string | null;
  /** OMIM links. */
  extdb_omim_id_url?: string[];
  /** SwissProt accessions. */
  extdb_swissprot?: string | null;
  /** TrEMBL accessions. */
  extdb_trembl?: string | null;
  /** UniParc accessions. */
  extdb_uniparc?: string | null;
  /** UniProt isoform accessions. */
  extdb_uniprot_isoform?: string | null;
  /** Orphanet gene id. */
  extdb_orphanet?: string | null;
  /** Orphanet links. */
  extdb_orphanet_url?: string[];
  /** GO terms associated. */
  extdb_go?: string | null;
  /** LOVD variant matching. */
  extdb_lovd?: string | null;
  /** GTEx mapping. */
  extdb_gtex?: string | null;
  /** GTEx link. */
  extdb_gtex_url?: string | null;
  /** Drug — CPIC level. */
  extdb_cpic?: string | null;
}

/** A variant record submitted for storage — system fields excluded. */
export type VariantInput = VariantRequiredFields & VariantOptionalFields;

/** A stored variant record. */
export interface Variant extends VariantRequiredFields, VariantOptionalFields {
  /** Surrogate primary key; generated at insert. */
  id: string;
  /** Ingest timestamp; set by the system (audit). */
  created_at: Date;
}

/** The required field names, in spec order — the order validation reports them in. */
export const VARIANT_REQUIRED_FIELDS = [
  'project_id',
  'version_date',
  'uri',
  'origin',
  'type',
  'collection',
] as const satisfies readonly (keyof VariantRequiredFields)[];

/** Fields the system generates; never taken from client input. */
export const VARIANT_SYSTEM_FIELDS = ['id', 'created_at'] as const;
