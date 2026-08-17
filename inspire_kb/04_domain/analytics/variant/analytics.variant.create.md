---
id: analytics::variant::create
module: analytics
entity: variant
action: create
lifecycle: accepted
requires: []
superseded_by: null
---

## Purpose
Insert an annotated genomic variant into the store. The caller submits a variant
record; the action validates it and persists it in ClickHouse. This is the
analytics module's write entry point, grounded in
[[../../../03_features/analytics/ANL-01|ANL-01]]; the append-only storage model is
set by [[../../../01_adr/adr-clickhouse-primary-database|adr-clickhouse-primary-database]].

## Inputs

The caller submits a whole variant record. The parameters below are the required
ones; every other field of [[analytics.variant|analytics::variant]] may be supplied
and is optional. `id` and `created_at` are system-generated and are not accepted
from input.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | number | yes | Project scope. Part of the natural key. |
| `uri` | string | yes | Variant URI. Part of the natural key. |
| `origin` | enum | yes | One of `GERMLINE` · `SOMATIC` · `TRIO` · `PGx`. |
| `type` | enum | yes | One of `SNV/INDEL` · `SV` · `CNV`. |
| `collection` | string | yes | Source collection. Part of the natural key. |
| `version_date` | timestamp | yes | Logical version; the greatest per natural key is the current record. |

## Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | The stored record's generated id. |

## Entities

### [[analytics.variant|analytics::variant]]
**Effect:** create

The action writes the whole record. `id` and `created_at` are system-generated; all
other fields are taken from the input record of the same name.

| Field | Touch | Type | Mapping | Notes |
|-------|-------|------|---------|-------|
| `id` | written | UUID | `uuid()` | Surrogate primary key; generated at insert. |
| `project_id` | written | UInt64 | `input.project_id` | Project scope; supplied by the caller. Part of the natural key. |
| `created_at` | written | DateTime64(3) | `now()` | Ingest timestamp; set by the system (audit). |
| `version_date` | written | DateTime64(3) | `input.version_date` | Caller-supplied logical version. |
| `uri` | written | String | `input.uri` | Variant URI. Part of the natural key. |
| `origin` | written | LowCardinality(String) | `input.origin` | Enum: `GERMLINE` · `SOMATIC` · `TRIO` · `PGx`. |
| `type` | written | LowCardinality(String) | `input.type` | Enum: `SNV/INDEL` · `SV` · `CNV`. |
| `collection` | written | String | `input.collection` | Source collection. Part of the natural key. |
| `hpo` | written | Array(String) | `input.hpo` | HPO codes. |
| `score` | written | Nullable(Float64) | `input.score` | Variant score. |
| `allele_frequency` | written | Nullable(Float64) | `input.allele_frequency` | Allele frequency. |
| `user_id` | written | Nullable(UInt64) | `input.user_id` | Source user id. |
| `annotation_version` | written | Nullable(String) | `input.annotation_version` | Annotation pipeline version. |
| `trio_variant_category` | written | LowCardinality(Nullable(String)) | `input.trio_variant_category` | Segregation variant category (enum). |
| `trio_category_tag` | written | LowCardinality(Nullable(String)) | `input.trio_category_tag` | Zygosity-combination tag (enum). |
| `ind1_zygosity` | written | LowCardinality(Nullable(String)) | `input.ind1_zygosity` | Zygosity ind.I (proband): `HOM`/`HET`/`REF/NO-COV`. |
| `ind1_vaf` | written | Nullable(Float64) | `input.ind1_vaf` | VAF (%) ind.I. |
| `ind1_dp` | written | Nullable(Float64) | `input.ind1_dp` | Read depth ind.I. |
| `ind2_zygosity` | written | LowCardinality(Nullable(String)) | `input.ind2_zygosity` | Zygosity ind.II (father). |
| `ind2_vaf` | written | Nullable(Float64) | `input.ind2_vaf` | VAF (%) ind.II. |
| `ind2_dp` | written | Nullable(Float64) | `input.ind2_dp` | Read depth ind.II. |
| `ind3_zygosity` | written | LowCardinality(Nullable(String)) | `input.ind3_zygosity` | Zygosity ind.III (mother). |
| `ind3_vaf` | written | Nullable(Float64) | `input.ind3_vaf` | VAF (%) ind.III. |
| `ind3_dp` | written | Nullable(Float64) | `input.ind3_dp` | Read depth ind.III. |
| `pos_genome` | written | Nullable(String) | `input.pos_genome` | Reference genome (required within the optional position block). |
| `pos_chr` | written | Nullable(String) | `input.pos_chr` | Chromosome (required within the optional position block). |
| `pos_position` | written | Nullable(UInt64) | `input.pos_position` | Position (required within the optional position block). |
| `pos_id` | written | Nullable(String) | `input.pos_id` | Identifier. |
| `pos_sv_end` | written | Nullable(UInt64) | `input.pos_sv_end` | SV end position. |
| `pos_sv_len` | written | Nullable(Int64) | `input.pos_sv_len` | SV length. |
| `pos_sb` | written | Nullable(String) | `input.pos_sb` | Strand bias. |
| `pos_seg_dup` | written | Nullable(String) | `input.pos_seg_dup` | Segmental-duplication overlap. |
| `pos_chrom_band` | written | Nullable(String) | `input.pos_chrom_band` | Chromosomal band. |
| `pos_microsat` | written | Nullable(String) | `input.pos_microsat` | Overlapping microsatellites id. |
| `gt_allele_ref` | written | Nullable(String) | `input.gt_allele_ref` | REF allele base(s). |
| `gt_allele_alt` | written | Nullable(String) | `input.gt_allele_alt` | ALT allele base(s). |
| `gt_allele_num` | written | Nullable(String) | `input.gt_allele_num` | Allele number from VCF. |
| `gt_allele` | written | Nullable(String) | `input.gt_allele` | Allele used for consequence. |
| `gt_calc_genotype` | written | Nullable(String) | `input.gt_calc_genotype` | Computed genotype. |
| `gt_zyg` | written | LowCardinality(Nullable(String)) | `input.gt_zyg` | Zygosity: `HOM`/`HET`/`HEM`. |
| `gt_aa` | written | Nullable(String) | `input.gt_aa` | Ancestral allele. |
| `gt_ac` | written | Nullable(String) | `input.gt_ac` | Allele count. |
| `gt_af` | written | Nullable(String) | `input.gt_af` | Allele frequency (per ALT). |
| `gt_an` | written | Nullable(Int64) | `input.gt_an` | Total alleles in called genotypes. |
| `gt_cigar` | written | Nullable(String) | `input.gt_cigar` | CIGAR string. |
| `gt_db` | written | Nullable(String) | `input.gt_db` | dbSNP membership. |
| `gt_end` | written | Nullable(String) | `input.gt_end` | End position (symbolic alleles). |
| `gt_h2` | written | Nullable(String) | `input.gt_h2` | HapMap2 membership. |
| `gt_h3` | written | Nullable(String) | `input.gt_h3` | HapMap3 membership. |
| `gt_format_gt` | written | Nullable(String) | `input.gt_format_gt` | FORMAT genotype. |
| `gt_format_ft` | written | Nullable(String) | `input.gt_format_ft` | Sample genotype filter. |
| `gt_format_gl` | written | Nullable(String) | `input.gt_format_gl` | Genotype likelihoods. |
| `gt_format_gle` | written | Nullable(String) | `input.gt_format_gle` | Genotype likelihoods (heterogeneous ploidy). |
| `gt_format_pl` | written | Nullable(String) | `input.gt_format_pl` | Phred-scaled genotype likelihoods. |
| `gt_format_gp` | written | Nullable(Float64) | `input.gt_format_gp` | Phred-scaled genotype posteriors. |
| `gt_format_gq` | written | Nullable(Float64) | `input.gt_format_gq` | Conditional genotype quality. |
| `gt_format_hq` | written | Nullable(String) | `input.gt_format_hq` | Haplotype qualities. |
| `gt_format_ps` | written | Nullable(Int64) | `input.gt_format_ps` | Phase set. |
| `gt_format_pq` | written | Nullable(Float64) | `input.gt_format_pq` | Phasing quality. |
| `gt_format_ec` | written | Nullable(String) | `input.gt_format_ec` | Expected alt allele counts. |
| `gt_format_mq` | written | Nullable(Float64) | `input.gt_format_mq` | RMS mapping quality (FORMAT). |
| `gt_technique` | written | LowCardinality(Nullable(String)) | `input.gt_technique` | Characterization technique (enum). |
| `call_filter` | written | Nullable(String) | `input.call_filter` | Filter status. |
| `call_quality` | written | Nullable(Float64) | `input.call_quality` | Phred-scaled quality in ALT. |
| `call_read_depth_ref` | written | Nullable(Float64) | `input.call_read_depth_ref` | Number of REF reads. |
| `call_read_pct_ref` | written | Nullable(Float64) | `input.call_read_pct_ref` | % REF reads. |
| `call_read_depth_alt` | written | Nullable(Float64) | `input.call_read_depth_alt` | Number of ALT reads. |
| `call_read_pct_alt` | written | Nullable(Float64) | `input.call_read_pct_alt` | % ALT reads. |
| `call_read_depth` | written | Nullable(Float64) | `input.call_read_depth` | Total read depth. |
| `call_bq` | written | Nullable(Float64) | `input.call_bq` | RMS base quality. |
| `call_dp` | written | Nullable(Float64) | `input.call_dp` | Combined depth across samples. |
| `call_mq` | written | Nullable(Float64) | `input.call_mq` | RMS mapping quality (INFO). |
| `call_mq0` | written | Nullable(Float64) | `input.call_mq0` | MAPQ==0 reads covering record. |
| `call_ns` | written | Nullable(String) | `input.call_ns` | Samples with data. |
| `call_format_dp` | written | Nullable(Float64) | `input.call_format_dp` | Sample read depth. |
| `call_sv_cipos` | written | Nullable(String) | `input.call_sv_cipos` | SV CI around POS. |
| `call_sv_ciend` | written | Nullable(String) | `input.call_sv_ciend` | SV CI around END. |
| `call_sv_cilen` | written | Nullable(String) | `input.call_sv_cilen` | SV CI around inserted length. |
| `call_sv_dp` | written | Nullable(Float64) | `input.call_sv_dp` | SV read depth of breakend segment. |
| `call_sv_dpadj` | written | Nullable(String) | `input.call_sv_dpadj` | SV read depth of adjacency. |
| `call_fold_change` | written | Nullable(Float64) | `input.call_fold_change` | CNV fold change. |
| `call_roq` | written | Nullable(Float64) | `input.call_roq` | Read-orientation quality. |
| `exist_existing_variation` | written | Nullable(String) | `input.exist_existing_variation` | Known co-located variants. |
| `exist_somatic` | written | Nullable(String) | `input.exist_somatic` | Somatic status of existing variants. |
| `exist_clin_sig` | written | Nullable(String) | `input.exist_clin_sig` | Allele-specific clinical significance. |
| `exist_pheno` | written | Nullable(String) | `input.exist_pheno` | Phenotype membership. |
| `exist_dbsnp` | written | Nullable(String) | `input.exist_dbsnp` | dbSNP overlapping variant(s). |
| `exist_cosmic` | written | Nullable(String) | `input.exist_cosmic` | COSMIC overlapping variant(s). |
| `exist_hgmd` | written | Nullable(String) | `input.exist_hgmd` | HGMD overlapping variant(s). |
| `exist_others` | written | Nullable(String) | `input.exist_others` | Other overlapping variant(s). |
| `exist_dbsnp_id` | written | Nullable(String) | `input.exist_dbsnp_id` | dbSNP id (rsname). |
| `exist_dbsnp_rs` | written | Nullable(String) | `input.exist_dbsnp_rs` | dbSNP rs number. |
| `exist_dbsnp_rs_url` | written | Array(String) | `input.exist_dbsnp_rs_url` | dbSNP rs links. |
| `exist_dbsnp_ssr` | written | Nullable(String) | `input.exist_dbsnp_ssr` | Variant suspect reason codes. |
| `exist_ensdgv` | written | Nullable(String) | `input.exist_ensdgv` | DGV variants inside this SV. |
| `clin_clinvar` | written | Nullable(String) | `input.clin_clinvar` | ClinVar variation id. |
| `clin_clinvar_url` | written | Nullable(String) | `input.clin_clinvar_url` | ClinVar variation link. |
| `clin_clinvar_clnsig` | written | Array(String) | `input.clin_clinvar_clnsig` | ClinVar clinical significance. |
| `clin_clinvar_clnsig_str` | written | Nullable(String) | `input.clin_clinvar_clnsig_str` | ClinVar clinical significance (string). |
| `clin_clinvar_clnrevstat` | written | Nullable(String) | `input.clin_clinvar_clnrevstat` | ClinVar review status. |
| `clin_clinvar_clndn` | written | Nullable(String) | `input.clin_clinvar_clndn` | ClinVar preferred disease name. |
| `clin_clinvar_clnsigconf` | written | Nullable(String) | `input.clin_clinvar_clnsigconf` | ClinVar conflicting significance. |
| `clin_acmg` | written | LowCardinality(Nullable(String)) | `input.clin_acmg` | ACMG classification prediction (enum). |
| `clin_gene_pheno` | written | Nullable(String) | `input.clin_gene_pheno` | Gene phenotype association flag. |
| `clin_clinvar_cnv` | written | Nullable(String) | `input.clin_clinvar_cnv` | ClinVar CNV id. |
| `clin_dbvar_path_dup` | written | Nullable(String) | `input.clin_dbvar_path_dup` | dbVar pathogenic duplication overlap. |
| `clin_dbvar_path_del` | written | Nullable(String) | `input.clin_dbvar_path_del` | dbVar pathogenic deletion overlap. |
| `clin_civic_variant_id` | written | Nullable(String) | `input.clin_civic_variant_id` | CIViC variant id. |
| `clin_civic_mp_name` | written | Nullable(String) | `input.clin_civic_mp_name` | CIViC molecular profile name. |
| `clin_civic_mp_score` | written | Nullable(String) | `input.clin_civic_mp_score` | CIViC molecular profile score. |
| `clin_civic_entity_significance` | written | Nullable(String) | `input.clin_civic_entity_significance` | CIViC entity significance. |
| `clin_civic_entity_disease` | written | Nullable(String) | `input.clin_civic_entity_disease` | CIViC entity disease. |
| `clin_civic_entity_therapies` | written | Nullable(String) | `input.clin_civic_entity_therapies` | CIViC entity therapies. |
| `clin_clngen_cat` | written | Nullable(String) | `input.clin_clngen_cat` | ClinGen clinical classification. |
| `clin_clngen_met` | written | Nullable(String) | `input.clin_clngen_met` | ClinGen ACMG criteria confirmed. |
| `clin_clngen_not_met` | written | Nullable(String) | `input.clin_clngen_not_met` | ClinGen ACMG criteria excluded. |
| `clin_intogen` | written | Nullable(String) | `input.clin_intogen` | Intogen cancer driver association. |
| `clin_cv_score` | written | Nullable(String) | `input.clin_cv_score` | CancerVar score. |
| `clin_cv_classification` | written | Nullable(String) | `input.clin_cv_classification` | CancerVar AMP/ASCO/CAP classification. |
| `clin_medgen_id` | written | Nullable(String) | `input.clin_medgen_id` | MedGen id. |
| `clin_medgen_disease` | written | Nullable(String) | `input.clin_medgen_disease` | MedGen disease associated. |
| `clin_medgen_disease_url` | written | Array(String) | `input.clin_medgen_disease_url` | MedGen disease links. |
| `clin_franklin` | written | Nullable(String) | `input.clin_franklin` | Franklin search tag. |
| `clin_franklin_url` | written | Nullable(String) | `input.clin_franklin_url` | Franklin search link. |
| `clin_disease_omim_orphanet` | written | Nullable(String) | `input.clin_disease_omim_orphanet` | OMIM/ORPHANET disease ids. |
| `pred_sift_prediction` | written | Nullable(String) | `input.pred_sift_prediction` | SIFT prediction. |
| `pred_enspolyphen_prediction` | written | Nullable(String) | `input.pred_enspolyphen_prediction` | PolyPhen HVar prediction. |
| `pred_revel_prediction` | written | Nullable(String) | `input.pred_revel_prediction` | REVEL prediction. |
| `pred_refpolyphen_prediction` | written | Nullable(String) | `input.pred_refpolyphen_prediction` | PolyPhen HDIV prediction. |
| `pred_lrt_score` | written | Nullable(Float64) | `input.pred_lrt_score` | LRT score. |
| `pred_mutationtaster_score` | written | Nullable(String) | `input.pred_mutationtaster_score` | MutationTaster score. |
| `pred_mutationassessor_score` | written | Nullable(String) | `input.pred_mutationassessor_score` | MutationAssessor score. |
| `pred_fathmm_score` | written | Nullable(String) | `input.pred_fathmm_score` | FATHMM score. |
| `pred_fathmm_mkl_score` | written | Nullable(Float64) | `input.pred_fathmm_mkl_score` | FATHMM-MKL score. |
| `pred_metasvm_score` | written | Nullable(Float64) | `input.pred_metasvm_score` | MetaSVM score. |
| `pred_metalr_score` | written | Nullable(Float64) | `input.pred_metalr_score` | MetaLR score. |
| `pred_gerp_rs` | written | Nullable(Float64) | `input.pred_gerp_rs` | GERP++ score. |
| `pred_phylop_mammalian` | written | Nullable(Float64) | `input.pred_phylop_mammalian` | phyloP mammalian score. |
| `pred_siphy_29way` | written | Nullable(Float64) | `input.pred_siphy_29way` | SiPhy 29-way logOdds score. |
| `pred_cadd_raw` | written | Nullable(Float64) | `input.pred_cadd_raw` | CADD raw score. |
| `pred_dann_score` | written | Nullable(Float64) | `input.pred_dann_score` | DANN score. |
| `pred_eigen_raw_coding` | written | Nullable(Float64) | `input.pred_eigen_raw_coding` | Eigen raw score. |
| `pred_genocanyon_score` | written | Nullable(Float64) | `input.pred_genocanyon_score` | GenoCanyon score. |
| `pred_ada_score` | written | Nullable(String) | `input.pred_ada_score` | dbscSNV ADA score. |
| `pred_rf_score` | written | Nullable(Float64) | `input.pred_rf_score` | dbscSNV RF score. |
| `pred_alphamissense_prediction` | written | Nullable(String) | `input.pred_alphamissense_prediction` | AlphaMissense prediction. |
| `pred_alphamissense_score` | written | Nullable(Float64) | `input.pred_alphamissense_score` | AlphaMissense score. |
| `pred_bayesdel_addaf_prediction` | written | Nullable(String) | `input.pred_bayesdel_addaf_prediction` | BayesDel addAF prediction. |
| `pred_bayesdel_addaf_score` | written | Nullable(Float64) | `input.pred_bayesdel_addaf_score` | BayesDel addAF score. |
| `pred_bayesdel_noaf_prediction` | written | Nullable(String) | `input.pred_bayesdel_noaf_prediction` | BayesDel noAF prediction. |
| `pred_cadd_prediction` | written | Nullable(String) | `input.pred_cadd_prediction` | CADD prediction. |
| `pred_cadd_phred_score` | written | Nullable(Float64) | `input.pred_cadd_phred_score` | CADD PHRED score. |
| `pred_carol_prediction` | written | Nullable(String) | `input.pred_carol_prediction` | CAROL prediction. |
| `pred_carol_score` | written | Nullable(Float64) | `input.pred_carol_score` | CAROL score. |
| `pred_clinpred_prediction` | written | Nullable(String) | `input.pred_clinpred_prediction` | ClinPred prediction. |
| `pred_clinpred_score` | written | Nullable(Float64) | `input.pred_clinpred_score` | ClinPred score. |
| `pred_dann_prediction` | written | Nullable(String) | `input.pred_dann_prediction` | DANN prediction. |
| `pred_eve_prediction` | written | Nullable(String) | `input.pred_eve_prediction` | EVE prediction. |
| `pred_eve_score` | written | Nullable(Float64) | `input.pred_eve_score` | EVE score. |
| `pred_loftool_score` | written | Nullable(Float64) | `input.pred_loftool_score` | LoFtool gene score. |
| `pred_metalr_prediction` | written | Nullable(String) | `input.pred_metalr_prediction` | MetaLR prediction. |
| `pred_metarnn_prediction` | written | Nullable(String) | `input.pred_metarnn_prediction` | MetaRNN prediction. |
| `pred_metarnn_score` | written | Nullable(Float64) | `input.pred_metarnn_score` | MetaRNN score. |
| `pred_polyphen_score` | written | Nullable(Float64) | `input.pred_polyphen_score` | PolyPhen score. |
| `pred_primateai_prediction` | written | Nullable(String) | `input.pred_primateai_prediction` | PrimateAI prediction. |
| `pred_primateai_score` | written | Nullable(Float64) | `input.pred_primateai_score` | PrimateAI score. |
| `pred_revel_score` | written | Nullable(Float64) | `input.pred_revel_score` | REVEL score. |
| `pred_sift_score` | written | Nullable(Float64) | `input.pred_sift_score` | SIFT score. |
| `pred_spadahc_sum` | written | Nullable(String) | `input.pred_spadahc_sum` | SpadaHC summary. |
| `pred_spliceai_prediction` | written | Nullable(String) | `input.pred_spliceai_prediction` | SpliceAI prediction. |
| `pred_spliceai_ag` | written | Nullable(Float64) | `input.pred_spliceai_ag` | SpliceAI score AG. |
| `pred_spliceai_al` | written | Nullable(Float64) | `input.pred_spliceai_al` | SpliceAI score AL. |
| `pred_spliceai_dg` | written | Nullable(Float64) | `input.pred_spliceai_dg` | SpliceAI score DG. |
| `pred_spliceai_dl` | written | Nullable(Float64) | `input.pred_spliceai_dl` | SpliceAI score DL. |
| `pred_vest4_prediction` | written | Nullable(String) | `input.pred_vest4_prediction` | VEST4 prediction. |
| `pred_vest4_score` | written | Nullable(Float64) | `input.pred_vest4_score` | VEST4 score. |
| `pred_gerp_prediction` | written | Nullable(String) | `input.pred_gerp_prediction` | GERP++ prediction. |
| `pred_exomiser_variant_score` | written | Nullable(Float64) | `input.pred_exomiser_variant_score` | Exomiser phenotypic variant score. |
| `pred_spliceai_ds_ag` | written | Nullable(Float64) | `input.pred_spliceai_ds_ag` | SpliceAI delta score acceptor gain. |
| `pred_spliceai_ds_al` | written | Nullable(Float64) | `input.pred_spliceai_ds_al` | SpliceAI delta score acceptor loss. |
| `pred_spliceai_ds_dg` | written | Nullable(Float64) | `input.pred_spliceai_ds_dg` | SpliceAI delta score donor gain. |
| `pred_spliceai_ds_dl` | written | Nullable(Float64) | `input.pred_spliceai_ds_dl` | SpliceAI delta score donor loss. |
| `pred_spliceai_dp_ag` | written | Nullable(Float64) | `input.pred_spliceai_dp_ag` | SpliceAI delta position acceptor gain. |
| `pred_spliceai_dp_al` | written | Nullable(Float64) | `input.pred_spliceai_dp_al` | SpliceAI delta position acceptor loss. |
| `pred_spliceai_dp_dg` | written | Nullable(Float64) | `input.pred_spliceai_dp_dg` | SpliceAI delta position donor gain. |
| `pred_spliceai_dp_dl` | written | Nullable(Float64) | `input.pred_spliceai_dp_dl` | SpliceAI delta position donor loss. |
| `pred_mitomap_mtscore` | written | Nullable(String) | `input.pred_mitomap_mtscore` | MitoMap score interpretation. |
| `pred_mitomap_quartile` | written | Nullable(String) | `input.pred_mitomap_quartile` | MitoMap quartile of raw scores. |
| `popaf_max_af` | written | Nullable(Float64) | `input.popaf_max_af` | Highest AF in any population. |
| `popaf_max_af_pops` | written | Nullable(String) | `input.popaf_max_af_pops` | Max-AF source population. |
| `popaf_1kg_all` | written | Nullable(Float64) | `input.popaf_1kg_all` | 1000G global. |
| `popaf_1kg_afr` | written | Nullable(Float64) | `input.popaf_1kg_afr` | 1000G African. |
| `popaf_1kg_amr` | written | Nullable(Float64) | `input.popaf_1kg_amr` | 1000G American. |
| `popaf_1kg_eas` | written | Nullable(Float64) | `input.popaf_1kg_eas` | 1000G East Asian. |
| `popaf_1kg_eur` | written | Nullable(Float64) | `input.popaf_1kg_eur` | 1000G European. |
| `popaf_1kg_sas` | written | Nullable(Float64) | `input.popaf_1kg_sas` | 1000G South Asian. |
| `popaf_gnomade` | written | Nullable(Float64) | `input.popaf_gnomade` | gnomAD exome combined. |
| `popaf_gnomade_afr` | written | Nullable(Float64) | `input.popaf_gnomade_afr` | gnomAD exome African. |
| `popaf_gnomade_amr` | written | Nullable(Float64) | `input.popaf_gnomade_amr` | gnomAD exome Latino. |
| `popaf_gnomade_asj` | written | Nullable(Float64) | `input.popaf_gnomade_asj` | gnomAD exome Ashkenazi. |
| `popaf_gnomade_eas` | written | Nullable(Float64) | `input.popaf_gnomade_eas` | gnomAD exome East Asian. |
| `popaf_gnomade_fin` | written | Nullable(Float64) | `input.popaf_gnomade_fin` | gnomAD exome Finnish. |
| `popaf_gnomade_nfe` | written | Nullable(Float64) | `input.popaf_gnomade_nfe` | gnomAD exome non-Finnish European. |
| `popaf_gnomade_oth` | written | Nullable(Float64) | `input.popaf_gnomade_oth` | gnomAD exome other. |
| `popaf_gnomade_sas` | written | Nullable(Float64) | `input.popaf_gnomade_sas` | gnomAD exome South Asian. |
| `popaf_gnomadg` | written | Nullable(Float64) | `input.popaf_gnomadg` | gnomAD genome combined. |
| `popaf_gnomadg_afr` | written | Nullable(Float64) | `input.popaf_gnomadg_afr` | gnomAD genome African. |
| `popaf_gnomadg_ami` | written | Nullable(Float64) | `input.popaf_gnomadg_ami` | gnomAD genome Amish. |
| `popaf_gnomadg_amr` | written | Nullable(Float64) | `input.popaf_gnomadg_amr` | gnomAD genome Latino. |
| `popaf_gnomadg_asj` | written | Nullable(Float64) | `input.popaf_gnomadg_asj` | gnomAD genome Ashkenazi. |
| `popaf_gnomadg_eas` | written | Nullable(Float64) | `input.popaf_gnomadg_eas` | gnomAD genome East Asian. |
| `popaf_gnomadg_fin` | written | Nullable(Float64) | `input.popaf_gnomadg_fin` | gnomAD genome Finnish. |
| `popaf_gnomadg_mid` | written | Nullable(Float64) | `input.popaf_gnomadg_mid` | gnomAD genome Mid-eastern. |
| `popaf_gnomadg_nfe` | written | Nullable(Float64) | `input.popaf_gnomadg_nfe` | gnomAD genome non-Finnish European. |
| `popaf_gnomadg_oth` | written | Nullable(Float64) | `input.popaf_gnomadg_oth` | gnomAD genome other. |
| `popaf_gnomadg_sas` | written | Nullable(Float64) | `input.popaf_gnomadg_sas` | gnomAD genome South Asian. |
| `popaf_gnomad_sv_evidence` | written | Nullable(String) | `input.popaf_gnomad_sv_evidence` | gnomAD SV evidence. |
| `popaf_gnomad_sv_svtype` | written | Nullable(String) | `input.popaf_gnomad_sv_svtype` | gnomAD SV type. |
| `popaf_gnomad_sv_af` | written | Nullable(String) | `input.popaf_gnomad_sv_af` | gnomAD SV allele frequency. |
| `popaf_gnomad_mito_ac_hom` | written | Nullable(Float64) | `input.popaf_gnomad_mito_ac_hom` | gnomAD mito allele count homoplasmy. |
| `popaf_gnomad_mito_af_hom` | written | Nullable(Float64) | `input.popaf_gnomad_mito_af_hom` | gnomAD mito allele freq homoplasmy. |
| `popaf_gnomad_mito_ac_het` | written | Nullable(Float64) | `input.popaf_gnomad_mito_ac_het` | gnomAD mito allele count heteroplasmy. |
| `popaf_gnomad_mito_af_het` | written | Nullable(Float64) | `input.popaf_gnomad_mito_af_het` | gnomAD mito allele freq heteroplasmy. |
| `popaf_exac_af` | written | Nullable(String) | `input.popaf_exac_af` | ExAC allele frequency. |
| `popaf_exac_an` | written | Nullable(String) | `input.popaf_exac_an` | ExAC total allele number. |
| `popaf_exac_ac` | written | Nullable(String) | `input.popaf_exac_ac` | ExAC ALT count. |
| `popaf_exac_ac_hemi` | written | Nullable(String) | `input.popaf_exac_ac_hemi` | ExAC hemizygous count. |
| `popaf_exac_ac_het` | written | Nullable(String) | `input.popaf_exac_ac_het` | ExAC heterozygous count. |
| `popaf_exac_ac_homo` | written | Nullable(String) | `input.popaf_exac_ac_homo` | ExAC homozygous count. |
| `popaf_gnomad_id` | written | Nullable(String) | `input.popaf_gnomad_id` | gnomAD coordinate string. |
| `popaf_gnomad_id_url` | written | Nullable(String) | `input.popaf_gnomad_id_url` | gnomAD link. |
| `popaf_pli_gene_score` | written | Nullable(Float64) | `input.popaf_pli_gene_score` | pLI gene loss-of-function tolerance. |
| `gene_ensembl_gene` | written | Nullable(String) | `input.gene_ensembl_gene` | Ensembl stable gene id. |
| `gene_symbol` | written | Nullable(String) | `input.gene_symbol` | Gene symbol. |
| `gene_symbol_source` | written | Nullable(String) | `input.gene_symbol_source` | Gene symbol source. |
| `gene_hgnc_id` | written | Nullable(String) | `input.gene_hgnc_id` | HGNC gene id. |
| `gene_hgnc_id_url` | written | Nullable(String) | `input.gene_hgnc_id_url` | HGNC link. |
| `feat_consequence` | written | Nullable(String) | `input.feat_consequence` | RefSeq consequence (VEP). |
| `feat_ens_consequence` | written | Nullable(String) | `input.feat_ens_consequence` | Ensembl consequence (VEP). |
| `feat_variant_class` | written | Nullable(String) | `input.feat_variant_class` | SO variant class. |
| `feat_feature` | written | Nullable(String) | `input.feat_feature` | RefSeq transcript id. |
| `feat_feature_url` | written | Nullable(String) | `input.feat_feature_url` | RefSeq transcript link. |
| `feat_feature_type` | written | Nullable(String) | `input.feat_feature_type` | RefSeq feature type. |
| `feat_canonical` | written | Nullable(String) | `input.feat_canonical` | RefSeq canonical flag. |
| `feat_strand` | written | Nullable(String) | `input.feat_strand` | Genomic strand. |
| `feat_ens_hgvsc` | written | Nullable(String) | `input.feat_ens_hgvsc` | Ensembl HGVSc. |
| `feat_hgvsc` | written | Nullable(String) | `input.feat_hgvsc` | RefSeq HGVSc. |
| `feat_ens_hgvsp` | written | Nullable(String) | `input.feat_ens_hgvsp` | Ensembl HGVSp. |
| `feat_hgvsg` | written | Nullable(String) | `input.feat_hgvsg` | HGVS genomic. |
| `feat_hgvs_offset` | written | Nullable(String) | `input.feat_hgvs_offset` | HGVS offset. |
| `feat_spdi` | written | Nullable(String) | `input.feat_spdi` | SPDI notation. |
| `feat_vrs` | written | Nullable(String) | `input.feat_vrs` | GA4GH VRS. |
| `feat_impact` | written | Nullable(String) | `input.feat_impact` | Consequence impact modifier. |
| `feat_biotype` | written | Nullable(String) | `input.feat_biotype` | Transcript/regulatory biotype. |
| `feat_ens_exon` | written | Nullable(String) | `input.feat_ens_exon` | Ensembl exon number. |
| `feat_ens_intron` | written | Nullable(String) | `input.feat_ens_intron` | Ensembl intron number. |
| `feat_ens_cdna_position` | written | Nullable(String) | `input.feat_ens_cdna_position` | Ensembl cDNA position. |
| `feat_ens_cds_position` | written | Nullable(String) | `input.feat_ens_cds_position` | Ensembl CDS position. |
| `feat_ens_protein_position` | written | Nullable(String) | `input.feat_ens_protein_position` | Ensembl protein position. |
| `feat_amino_acids` | written | Nullable(String) | `input.feat_amino_acids` | Reference/variant amino acids. |
| `feat_codons` | written | Nullable(String) | `input.feat_codons` | Reference/variant codons. |
| `feat_distance` | written | Nullable(String) | `input.feat_distance` | Distance variant→transcript. |
| `feat_flags` | written | Nullable(String) | `input.feat_flags` | Transcript quality flags. |
| `feat_pubmed` | written | Nullable(String) | `input.feat_pubmed` | PubMed ids. |
| `feat_pubmed_url` | written | Array(String) | `input.feat_pubmed_url` | PubMed links. |
| `feat_custom_annotation` | written | Nullable(String) | `input.feat_custom_annotation` | Custom annotations. |
| `feat_ens_feature` | written | Nullable(String) | `input.feat_ens_feature` | Ensembl stable feature id. |
| `feat_ens_feature_url` | written | Nullable(String) | `input.feat_ens_feature_url` | Ensembl feature link. |
| `feat_ens_feature_type` | written | Nullable(String) | `input.feat_ens_feature_type` | Ensembl feature type. |
| `feat_ens_canonical` | written | Nullable(String) | `input.feat_ens_canonical` | Ensembl canonical flag. |
| `feat_hgvsp` | written | Nullable(String) | `input.feat_hgvsp` | RefSeq HGVSp. |
| `feat_exon` | written | Nullable(String) | `input.feat_exon` | RefSeq exon number. |
| `feat_intron` | written | Nullable(String) | `input.feat_intron` | RefSeq intron number. |
| `feat_cdna_position` | written | Nullable(String) | `input.feat_cdna_position` | RefSeq cDNA position. |
| `feat_cds_position` | written | Nullable(String) | `input.feat_cds_position` | RefSeq CDS position. |
| `feat_protein_position` | written | Nullable(String) | `input.feat_protein_position` | RefSeq protein position. |
| `feat_target_gene` | written | Nullable(String) | `input.feat_target_gene` | Target gene. |
| `extdb_omim_id` | written | Nullable(String) | `input.extdb_omim_id` | OMIM gene id. |
| `extdb_omim_id_url` | written | Array(String) | `input.extdb_omim_id_url` | OMIM links. |
| `extdb_swissprot` | written | Nullable(String) | `input.extdb_swissprot` | SwissProt accessions. |
| `extdb_trembl` | written | Nullable(String) | `input.extdb_trembl` | TrEMBL accessions. |
| `extdb_uniparc` | written | Nullable(String) | `input.extdb_uniparc` | UniParc accessions. |
| `extdb_uniprot_isoform` | written | Nullable(String) | `input.extdb_uniprot_isoform` | UniProt isoform accessions. |
| `extdb_orphanet` | written | Nullable(String) | `input.extdb_orphanet` | Orphanet gene id. |
| `extdb_orphanet_url` | written | Array(String) | `input.extdb_orphanet_url` | Orphanet links. |
| `extdb_go` | written | Nullable(String) | `input.extdb_go` | GO terms associated. |
| `extdb_lovd` | written | Nullable(String) | `input.extdb_lovd` | LOVD variant matching. |
| `extdb_gtex` | written | Nullable(String) | `input.extdb_gtex` | GTEx mapping. |
| `extdb_gtex_url` | written | Nullable(String) | `input.extdb_gtex_url` | GTEx link. |
| `extdb_cpic` | written | Nullable(String) | `input.extdb_cpic` | Drug — CPIC level. |

## Behavior
1. Validate that the required fields are present and that `origin` and `type` carry
   values within their enums, per the acceptance criteria of
   [[../../../03_features/analytics/ANL-01|ANL-01]].
2. Generate `id` and set `created_at` to the current time.
3. Persist the record (append-only). The current state of the variant becomes this
   record only if its `version_date` is the greatest for the natural key
   `(project_id, collection, uri)`; a lower `version_date` leaves the current state
   unchanged, per the invariants of [[analytics.variant|analytics::variant]] and the
   realization in
   [[../../../01_adr/adr-variant-history-current-projection|adr-variant-history-current-projection]].

## Errors
- `missing_required_field` — operator-facing message: "A required field is missing: {field}."
- `invalid_enum_value` — operator-facing message: "Field {field} must be one of: {allowed}."
