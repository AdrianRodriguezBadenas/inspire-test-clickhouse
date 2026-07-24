---
id: analytics.variant
module: analytics
entity: variant
lifecycle: accepted
---

## Purpose
An annotated genomic variant — one call from a VCF-derived pipeline, carrying its
genomic position, genotype, calling statistics, functional predictions, population
frequencies, clinical significance and cross-database annotations. It is the single
record the analytics module stores and serves, grounded in
[[../../../03_features/analytics/ANL-01|ANL-01]] (insert) and
[[../../../03_features/analytics/ANL-02|ANL-02]] (query). It is stored in ClickHouse
per [[../../../01_adr/adr-clickhouse-primary-database|adr-clickhouse-primary-database]].

## Rationale
The field shape mirrors the upstream annotation document one-to-one: the variant is
produced by an external VCF-annotation pipeline, so the entity is a faithful,
flattened transcription of that structure rather than a re-modelled subset — every
annotation a downstream consumer might filter or read is preserved. The nested
annotation blocks of the source document (position, genotype, calling statistics,
predictors, population allele frequencies, clinical significance, gene, feature,
external databases, trio/duo) are flattened into prefixed columns because ClickHouse
favours wide, denormalised tables over nested joins, per
[[../../../01_adr/adr-clickhouse-primary-database|adr-clickhouse-primary-database]];
the prefix disambiguates names that recur across blocks (e.g. mapping quality
appears in both genotype and calling-statistics).

Four fields exist beyond the source document. `project_id` scopes each record to a
project, making the store multi-tenant. `version_date` is supplied by the caller and
is the logical version of the record: the current state of a variant is the one with
the greatest `version_date` for its natural key, so records arriving out of order
(e.g. from an asynchronous ingestion queue) resolve correctly regardless of arrival
order. `created_at` is the system-set ingest timestamp, kept for audit. `id` is a
per-record identifier. There is no `updated_at` and no in-place update: the store is
append-only and a change is a new record with a higher `version_date` — the
history + current-projection realization is set by
[[../../../01_adr/adr-variant-history-current-projection|adr-variant-history-current-projection]].

## Invariants
- `(project_id, collection, uri)` is the natural key of a variant.
- The **current** state of a variant is the record with the greatest `version_date`
  for its natural key. Inserting a record with a lower `version_date` never changes
  the current state — ingestion order does not matter (out-of-order safe).
- `version_date` is caller-supplied and is the record's logical version.
- `created_at` is set by the system at insert (ingest audit) and never updated.
- Rows are append-only — no field is mutated in place; a change is a new record with
  a higher `version_date`.
- `uri`, `origin`, `type`, `collection` and `version_date` are always present (non-null).
- `id` is unique across all rows and immutable once set.

## Fields

Control + natural-key fields first, then the annotation columns grouped by their
source block (prefix in parentheses): trio/duo (`trio_`/`ind*_`), genomic position
(`pos_`), genotype (`gt_`), calling statistics (`call_`), co-located variants
(`exist_`), clinical significance (`clin_`), predictors (`pred_`), population allele
frequency (`popaf_`), gene (`gene_`), feature (`feat_`), external databases (`extdb_`).

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUID` | Surrogate primary key; generated at insert. |
| `project_id` | `UInt64` | Project scope; supplied by the caller. Part of the natural key. |
| `created_at` | `DateTime64(3)` | Ingest timestamp; set by the system (audit). |
| `version_date` | `DateTime64(3)` | Caller-supplied logical version; greatest per natural key is current. |
| `uri` | `String` | Variant URI. Part of the natural key. |
| `origin` | `LowCardinality(String)` | Enum: `GERMLINE` · `SOMATIC` · `TRIO` · `PGx`. |
| `type` | `LowCardinality(String)` | Enum: `SNV/INDEL` · `SV` · `CNV`. |
| `collection` | `String` | Source collection. Part of the natural key. |
| `hpo` | `Array(String)` | HPO codes. |
| `score` | `Nullable(Float64)` | Variant score. |
| `allele_frequency` | `Nullable(Float64)` | Allele frequency. |
| `user_id` | `Nullable(UInt64)` | Source user id. |
| `annotation_version` | `Nullable(String)` | Annotation pipeline version. |
| `trio_variant_category` | `LowCardinality(Nullable(String))` | Segregation variant category (enum). |
| `trio_category_tag` | `LowCardinality(Nullable(String))` | Zygosity-combination tag (enum). |
| `ind1_zygosity` | `LowCardinality(Nullable(String))` | Zygosity ind.I (proband): `HOM`/`HET`/`REF/NO-COV`. |
| `ind1_vaf` | `Nullable(Float64)` | VAF (%) ind.I. |
| `ind1_dp` | `Nullable(Float64)` | Read depth ind.I. |
| `ind2_zygosity` | `LowCardinality(Nullable(String))` | Zygosity ind.II (father). |
| `ind2_vaf` | `Nullable(Float64)` | VAF (%) ind.II. |
| `ind2_dp` | `Nullable(Float64)` | Read depth ind.II. |
| `ind3_zygosity` | `LowCardinality(Nullable(String))` | Zygosity ind.III (mother). |
| `ind3_vaf` | `Nullable(Float64)` | VAF (%) ind.III. |
| `ind3_dp` | `Nullable(Float64)` | Read depth ind.III. |
| `pos_genome` | `Nullable(String)` | Reference genome (required within the optional position block). |
| `pos_chr` | `Nullable(String)` | Chromosome (required within the optional position block). |
| `pos_position` | `Nullable(UInt64)` | Position (required within the optional position block). |
| `pos_id` | `Nullable(String)` | Identifier. |
| `pos_sv_end` | `Nullable(UInt64)` | SV end position. |
| `pos_sv_len` | `Nullable(Int64)` | SV length. |
| `pos_sb` | `Nullable(String)` | Strand bias. |
| `pos_seg_dup` | `Nullable(String)` | Segmental-duplication overlap. |
| `pos_chrom_band` | `Nullable(String)` | Chromosomal band. |
| `pos_microsat` | `Nullable(String)` | Overlapping microsatellites id. |
| `gt_allele_ref` | `Nullable(String)` | REF allele base(s). |
| `gt_allele_alt` | `Nullable(String)` | ALT allele base(s). |
| `gt_allele_num` | `Nullable(String)` | Allele number from VCF. |
| `gt_allele` | `Nullable(String)` | Allele used for consequence. |
| `gt_calc_genotype` | `Nullable(String)` | Computed genotype. |
| `gt_zyg` | `LowCardinality(Nullable(String))` | Zygosity: `HOM`/`HET`/`HEM`. |
| `gt_aa` | `Nullable(String)` | Ancestral allele. |
| `gt_ac` | `Nullable(String)` | Allele count. |
| `gt_af` | `Nullable(String)` | Allele frequency (per ALT). |
| `gt_an` | `Nullable(Int64)` | Total alleles in called genotypes. |
| `gt_cigar` | `Nullable(String)` | CIGAR string. |
| `gt_db` | `Nullable(String)` | dbSNP membership. |
| `gt_end` | `Nullable(String)` | End position (symbolic alleles). |
| `gt_h2` | `Nullable(String)` | HapMap2 membership. |
| `gt_h3` | `Nullable(String)` | HapMap3 membership. |
| `gt_format_gt` | `Nullable(String)` | FORMAT genotype. |
| `gt_format_ft` | `Nullable(String)` | Sample genotype filter. |
| `gt_format_gl` | `Nullable(String)` | Genotype likelihoods. |
| `gt_format_gle` | `Nullable(String)` | Genotype likelihoods (heterogeneous ploidy). |
| `gt_format_pl` | `Nullable(String)` | Phred-scaled genotype likelihoods. |
| `gt_format_gp` | `Nullable(Float64)` | Phred-scaled genotype posteriors. |
| `gt_format_gq` | `Nullable(Float64)` | Conditional genotype quality. |
| `gt_format_hq` | `Nullable(String)` | Haplotype qualities. |
| `gt_format_ps` | `Nullable(Int64)` | Phase set. |
| `gt_format_pq` | `Nullable(Float64)` | Phasing quality. |
| `gt_format_ec` | `Nullable(String)` | Expected alt allele counts. |
| `gt_format_mq` | `Nullable(Float64)` | RMS mapping quality (FORMAT). |
| `gt_technique` | `LowCardinality(Nullable(String))` | Characterization technique (enum). |
| `call_filter` | `Nullable(String)` | Filter status. |
| `call_quality` | `Nullable(Float64)` | Phred-scaled quality in ALT. |
| `call_read_depth_ref` | `Nullable(Float64)` | Number of REF reads. |
| `call_read_pct_ref` | `Nullable(Float64)` | % REF reads. |
| `call_read_depth_alt` | `Nullable(Float64)` | Number of ALT reads. |
| `call_read_pct_alt` | `Nullable(Float64)` | % ALT reads. |
| `call_read_depth` | `Nullable(Float64)` | Total read depth. |
| `call_bq` | `Nullable(Float64)` | RMS base quality. |
| `call_dp` | `Nullable(Float64)` | Combined depth across samples. |
| `call_mq` | `Nullable(Float64)` | RMS mapping quality (INFO). |
| `call_mq0` | `Nullable(Float64)` | MAPQ==0 reads covering record. |
| `call_ns` | `Nullable(String)` | Samples with data. |
| `call_format_dp` | `Nullable(Float64)` | Sample read depth. |
| `call_sv_cipos` | `Nullable(String)` | SV CI around POS. |
| `call_sv_ciend` | `Nullable(String)` | SV CI around END. |
| `call_sv_cilen` | `Nullable(String)` | SV CI around inserted length. |
| `call_sv_dp` | `Nullable(Float64)` | SV read depth of breakend segment. |
| `call_sv_dpadj` | `Nullable(String)` | SV read depth of adjacency. |
| `call_fold_change` | `Nullable(Float64)` | CNV fold change. |
| `call_roq` | `Nullable(Float64)` | Read-orientation quality. |
| `exist_existing_variation` | `Nullable(String)` | Known co-located variants. |
| `exist_somatic` | `Nullable(String)` | Somatic status of existing variants. |
| `exist_clin_sig` | `Nullable(String)` | Allele-specific clinical significance. |
| `exist_pheno` | `Nullable(String)` | Phenotype membership. |
| `exist_dbsnp` | `Nullable(String)` | dbSNP overlapping variant(s). |
| `exist_cosmic` | `Nullable(String)` | COSMIC overlapping variant(s). |
| `exist_hgmd` | `Nullable(String)` | HGMD overlapping variant(s). |
| `exist_others` | `Nullable(String)` | Other overlapping variant(s). |
| `exist_dbsnp_id` | `Nullable(String)` | dbSNP id (rsname). |
| `exist_dbsnp_rs` | `Nullable(String)` | dbSNP rs number. |
| `exist_dbsnp_rs_url` | `Array(String)` | dbSNP rs links. |
| `exist_dbsnp_ssr` | `Nullable(String)` | Variant suspect reason codes. |
| `exist_ensdgv` | `Nullable(String)` | DGV variants inside this SV. |
| `clin_clinvar` | `Nullable(String)` | ClinVar variation id. |
| `clin_clinvar_url` | `Nullable(String)` | ClinVar variation link. |
| `clin_clinvar_clnsig` | `Array(String)` | ClinVar clinical significance. |
| `clin_clinvar_clnsig_str` | `Nullable(String)` | ClinVar clinical significance (string). |
| `clin_clinvar_clnrevstat` | `Nullable(String)` | ClinVar review status. |
| `clin_clinvar_clndn` | `Nullable(String)` | ClinVar preferred disease name. |
| `clin_clinvar_clnsigconf` | `Nullable(String)` | ClinVar conflicting significance. |
| `clin_acmg` | `LowCardinality(Nullable(String))` | ACMG classification prediction (enum). |
| `clin_gene_pheno` | `Nullable(String)` | Gene phenotype association flag. |
| `clin_clinvar_cnv` | `Nullable(String)` | ClinVar CNV id. |
| `clin_dbvar_path_dup` | `Nullable(String)` | dbVar pathogenic duplication overlap. |
| `clin_dbvar_path_del` | `Nullable(String)` | dbVar pathogenic deletion overlap. |
| `clin_civic_variant_id` | `Nullable(String)` | CIViC variant id. |
| `clin_civic_mp_name` | `Nullable(String)` | CIViC molecular profile name. |
| `clin_civic_mp_score` | `Nullable(String)` | CIViC molecular profile score. |
| `clin_civic_entity_significance` | `Nullable(String)` | CIViC entity significance. |
| `clin_civic_entity_disease` | `Nullable(String)` | CIViC entity disease. |
| `clin_civic_entity_therapies` | `Nullable(String)` | CIViC entity therapies. |
| `clin_clngen_cat` | `Nullable(String)` | ClinGen clinical classification. |
| `clin_clngen_met` | `Nullable(String)` | ClinGen ACMG criteria confirmed. |
| `clin_clngen_not_met` | `Nullable(String)` | ClinGen ACMG criteria excluded. |
| `clin_intogen` | `Nullable(String)` | Intogen cancer driver association. |
| `clin_cv_score` | `Nullable(String)` | CancerVar score. |
| `clin_cv_classification` | `Nullable(String)` | CancerVar AMP/ASCO/CAP classification. |
| `clin_medgen_id` | `Nullable(String)` | MedGen id. |
| `clin_medgen_disease` | `Nullable(String)` | MedGen disease associated. |
| `clin_medgen_disease_url` | `Array(String)` | MedGen disease links. |
| `clin_franklin` | `Nullable(String)` | Franklin search tag. |
| `clin_franklin_url` | `Nullable(String)` | Franklin search link. |
| `clin_disease_omim_orphanet` | `Nullable(String)` | OMIM/ORPHANET disease ids. |
| `pred_sift_prediction` | `Nullable(String)` | SIFT prediction. |
| `pred_enspolyphen_prediction` | `Nullable(String)` | PolyPhen HVar prediction. |
| `pred_revel_prediction` | `Nullable(String)` | REVEL prediction. |
| `pred_refpolyphen_prediction` | `Nullable(String)` | PolyPhen HDIV prediction. |
| `pred_lrt_score` | `Nullable(Float64)` | LRT score. |
| `pred_mutationtaster_score` | `Nullable(String)` | MutationTaster score. |
| `pred_mutationassessor_score` | `Nullable(String)` | MutationAssessor score. |
| `pred_fathmm_score` | `Nullable(String)` | FATHMM score. |
| `pred_fathmm_mkl_score` | `Nullable(Float64)` | FATHMM-MKL score. |
| `pred_metasvm_score` | `Nullable(Float64)` | MetaSVM score. |
| `pred_metalr_score` | `Nullable(Float64)` | MetaLR score. |
| `pred_gerp_rs` | `Nullable(Float64)` | GERP++ score. |
| `pred_phylop_mammalian` | `Nullable(Float64)` | phyloP mammalian score. |
| `pred_siphy_29way` | `Nullable(Float64)` | SiPhy 29-way logOdds score. |
| `pred_cadd_raw` | `Nullable(Float64)` | CADD raw score. |
| `pred_dann_score` | `Nullable(Float64)` | DANN score. |
| `pred_eigen_raw_coding` | `Nullable(Float64)` | Eigen raw score. |
| `pred_genocanyon_score` | `Nullable(Float64)` | GenoCanyon score. |
| `pred_ada_score` | `Nullable(String)` | dbscSNV ADA score. |
| `pred_rf_score` | `Nullable(Float64)` | dbscSNV RF score. |
| `pred_alphamissense_prediction` | `Nullable(String)` | AlphaMissense prediction. |
| `pred_alphamissense_score` | `Nullable(Float64)` | AlphaMissense score. |
| `pred_bayesdel_addaf_prediction` | `Nullable(String)` | BayesDel addAF prediction. |
| `pred_bayesdel_addaf_score` | `Nullable(Float64)` | BayesDel addAF score. |
| `pred_bayesdel_noaf_prediction` | `Nullable(String)` | BayesDel noAF prediction. |
| `pred_cadd_prediction` | `Nullable(String)` | CADD prediction. |
| `pred_cadd_phred_score` | `Nullable(Float64)` | CADD PHRED score. |
| `pred_carol_prediction` | `Nullable(String)` | CAROL prediction. |
| `pred_carol_score` | `Nullable(Float64)` | CAROL score. |
| `pred_clinpred_prediction` | `Nullable(String)` | ClinPred prediction. |
| `pred_clinpred_score` | `Nullable(Float64)` | ClinPred score. |
| `pred_dann_prediction` | `Nullable(String)` | DANN prediction. |
| `pred_eve_prediction` | `Nullable(String)` | EVE prediction. |
| `pred_eve_score` | `Nullable(Float64)` | EVE score. |
| `pred_loftool_score` | `Nullable(Float64)` | LoFtool gene score. |
| `pred_metalr_prediction` | `Nullable(String)` | MetaLR prediction. |
| `pred_metarnn_prediction` | `Nullable(String)` | MetaRNN prediction. |
| `pred_metarnn_score` | `Nullable(Float64)` | MetaRNN score. |
| `pred_polyphen_score` | `Nullable(Float64)` | PolyPhen score. |
| `pred_primateai_prediction` | `Nullable(String)` | PrimateAI prediction. |
| `pred_primateai_score` | `Nullable(Float64)` | PrimateAI score. |
| `pred_revel_score` | `Nullable(Float64)` | REVEL score. |
| `pred_sift_score` | `Nullable(Float64)` | SIFT score. |
| `pred_spadahc_sum` | `Nullable(String)` | SpadaHC summary. |
| `pred_spliceai_prediction` | `Nullable(String)` | SpliceAI prediction. |
| `pred_spliceai_ag` | `Nullable(Float64)` | SpliceAI score AG. |
| `pred_spliceai_al` | `Nullable(Float64)` | SpliceAI score AL. |
| `pred_spliceai_dg` | `Nullable(Float64)` | SpliceAI score DG. |
| `pred_spliceai_dl` | `Nullable(Float64)` | SpliceAI score DL. |
| `pred_vest4_prediction` | `Nullable(String)` | VEST4 prediction. |
| `pred_vest4_score` | `Nullable(Float64)` | VEST4 score. |
| `pred_gerp_prediction` | `Nullable(String)` | GERP++ prediction. |
| `pred_exomiser_variant_score` | `Nullable(Float64)` | Exomiser phenotypic variant score. |
| `pred_spliceai_ds_ag` | `Nullable(Float64)` | SpliceAI delta score acceptor gain. |
| `pred_spliceai_ds_al` | `Nullable(Float64)` | SpliceAI delta score acceptor loss. |
| `pred_spliceai_ds_dg` | `Nullable(Float64)` | SpliceAI delta score donor gain. |
| `pred_spliceai_ds_dl` | `Nullable(Float64)` | SpliceAI delta score donor loss. |
| `pred_spliceai_dp_ag` | `Nullable(Float64)` | SpliceAI delta position acceptor gain. |
| `pred_spliceai_dp_al` | `Nullable(Float64)` | SpliceAI delta position acceptor loss. |
| `pred_spliceai_dp_dg` | `Nullable(Float64)` | SpliceAI delta position donor gain. |
| `pred_spliceai_dp_dl` | `Nullable(Float64)` | SpliceAI delta position donor loss. |
| `pred_mitomap_mtscore` | `Nullable(String)` | MitoMap score interpretation. |
| `pred_mitomap_quartile` | `Nullable(String)` | MitoMap quartile of raw scores. |
| `popaf_max_af` | `Nullable(Float64)` | Highest AF in any population. |
| `popaf_max_af_pops` | `Nullable(String)` | Max-AF source population. |
| `popaf_1kg_all` | `Nullable(Float64)` | 1000G global. |
| `popaf_1kg_afr` | `Nullable(Float64)` | 1000G African. |
| `popaf_1kg_amr` | `Nullable(Float64)` | 1000G American. |
| `popaf_1kg_eas` | `Nullable(Float64)` | 1000G East Asian. |
| `popaf_1kg_eur` | `Nullable(Float64)` | 1000G European. |
| `popaf_1kg_sas` | `Nullable(Float64)` | 1000G South Asian. |
| `popaf_gnomade` | `Nullable(Float64)` | gnomAD exome combined. |
| `popaf_gnomade_afr` | `Nullable(Float64)` | gnomAD exome African. |
| `popaf_gnomade_amr` | `Nullable(Float64)` | gnomAD exome Latino. |
| `popaf_gnomade_asj` | `Nullable(Float64)` | gnomAD exome Ashkenazi. |
| `popaf_gnomade_eas` | `Nullable(Float64)` | gnomAD exome East Asian. |
| `popaf_gnomade_fin` | `Nullable(Float64)` | gnomAD exome Finnish. |
| `popaf_gnomade_nfe` | `Nullable(Float64)` | gnomAD exome non-Finnish European. |
| `popaf_gnomade_oth` | `Nullable(Float64)` | gnomAD exome other. |
| `popaf_gnomade_sas` | `Nullable(Float64)` | gnomAD exome South Asian. |
| `popaf_gnomadg` | `Nullable(Float64)` | gnomAD genome combined. |
| `popaf_gnomadg_afr` | `Nullable(Float64)` | gnomAD genome African. |
| `popaf_gnomadg_ami` | `Nullable(Float64)` | gnomAD genome Amish. |
| `popaf_gnomadg_amr` | `Nullable(Float64)` | gnomAD genome Latino. |
| `popaf_gnomadg_asj` | `Nullable(Float64)` | gnomAD genome Ashkenazi. |
| `popaf_gnomadg_eas` | `Nullable(Float64)` | gnomAD genome East Asian. |
| `popaf_gnomadg_fin` | `Nullable(Float64)` | gnomAD genome Finnish. |
| `popaf_gnomadg_mid` | `Nullable(Float64)` | gnomAD genome Mid-eastern. |
| `popaf_gnomadg_nfe` | `Nullable(Float64)` | gnomAD genome non-Finnish European. |
| `popaf_gnomadg_oth` | `Nullable(Float64)` | gnomAD genome other. |
| `popaf_gnomadg_sas` | `Nullable(Float64)` | gnomAD genome South Asian. |
| `popaf_gnomad_sv_evidence` | `Nullable(String)` | gnomAD SV evidence. |
| `popaf_gnomad_sv_svtype` | `Nullable(String)` | gnomAD SV type. |
| `popaf_gnomad_sv_af` | `Nullable(String)` | gnomAD SV allele frequency. |
| `popaf_gnomad_mito_ac_hom` | `Nullable(Float64)` | gnomAD mito allele count homoplasmy. |
| `popaf_gnomad_mito_af_hom` | `Nullable(Float64)` | gnomAD mito allele freq homoplasmy. |
| `popaf_gnomad_mito_ac_het` | `Nullable(Float64)` | gnomAD mito allele count heteroplasmy. |
| `popaf_gnomad_mito_af_het` | `Nullable(Float64)` | gnomAD mito allele freq heteroplasmy. |
| `popaf_exac_af` | `Nullable(String)` | ExAC allele frequency. |
| `popaf_exac_an` | `Nullable(String)` | ExAC total allele number. |
| `popaf_exac_ac` | `Nullable(String)` | ExAC ALT count. |
| `popaf_exac_ac_hemi` | `Nullable(String)` | ExAC hemizygous count. |
| `popaf_exac_ac_het` | `Nullable(String)` | ExAC heterozygous count. |
| `popaf_exac_ac_homo` | `Nullable(String)` | ExAC homozygous count. |
| `popaf_gnomad_id` | `Nullable(String)` | gnomAD coordinate string. |
| `popaf_gnomad_id_url` | `Nullable(String)` | gnomAD link. |
| `popaf_pli_gene_score` | `Nullable(Float64)` | pLI gene loss-of-function tolerance. |
| `gene_ensembl_gene` | `Nullable(String)` | Ensembl stable gene id. |
| `gene_symbol` | `Nullable(String)` | Gene symbol. |
| `gene_symbol_source` | `Nullable(String)` | Gene symbol source. |
| `gene_hgnc_id` | `Nullable(String)` | HGNC gene id. |
| `gene_hgnc_id_url` | `Nullable(String)` | HGNC link. |
| `feat_consequence` | `Nullable(String)` | RefSeq consequence (VEP). |
| `feat_ens_consequence` | `Nullable(String)` | Ensembl consequence (VEP). |
| `feat_variant_class` | `Nullable(String)` | SO variant class. |
| `feat_feature` | `Nullable(String)` | RefSeq transcript id. |
| `feat_feature_url` | `Nullable(String)` | RefSeq transcript link. |
| `feat_feature_type` | `Nullable(String)` | RefSeq feature type. |
| `feat_canonical` | `Nullable(String)` | RefSeq canonical flag. |
| `feat_strand` | `Nullable(String)` | Genomic strand. |
| `feat_ens_hgvsc` | `Nullable(String)` | Ensembl HGVSc. |
| `feat_hgvsc` | `Nullable(String)` | RefSeq HGVSc. |
| `feat_ens_hgvsp` | `Nullable(String)` | Ensembl HGVSp. |
| `feat_hgvsg` | `Nullable(String)` | HGVS genomic. |
| `feat_hgvs_offset` | `Nullable(String)` | HGVS offset. |
| `feat_spdi` | `Nullable(String)` | SPDI notation. |
| `feat_vrs` | `Nullable(String)` | GA4GH VRS. |
| `feat_impact` | `Nullable(String)` | Consequence impact modifier. |
| `feat_biotype` | `Nullable(String)` | Transcript/regulatory biotype. |
| `feat_ens_exon` | `Nullable(String)` | Ensembl exon number. |
| `feat_ens_intron` | `Nullable(String)` | Ensembl intron number. |
| `feat_ens_cdna_position` | `Nullable(String)` | Ensembl cDNA position. |
| `feat_ens_cds_position` | `Nullable(String)` | Ensembl CDS position. |
| `feat_ens_protein_position` | `Nullable(String)` | Ensembl protein position. |
| `feat_amino_acids` | `Nullable(String)` | Reference/variant amino acids. |
| `feat_codons` | `Nullable(String)` | Reference/variant codons. |
| `feat_distance` | `Nullable(String)` | Distance variant→transcript. |
| `feat_flags` | `Nullable(String)` | Transcript quality flags. |
| `feat_pubmed` | `Nullable(String)` | PubMed ids. |
| `feat_pubmed_url` | `Array(String)` | PubMed links. |
| `feat_custom_annotation` | `Nullable(String)` | Custom annotations. |
| `feat_ens_feature` | `Nullable(String)` | Ensembl stable feature id. |
| `feat_ens_feature_url` | `Nullable(String)` | Ensembl feature link. |
| `feat_ens_feature_type` | `Nullable(String)` | Ensembl feature type. |
| `feat_ens_canonical` | `Nullable(String)` | Ensembl canonical flag. |
| `feat_hgvsp` | `Nullable(String)` | RefSeq HGVSp. |
| `feat_exon` | `Nullable(String)` | RefSeq exon number. |
| `feat_intron` | `Nullable(String)` | RefSeq intron number. |
| `feat_cdna_position` | `Nullable(String)` | RefSeq cDNA position. |
| `feat_cds_position` | `Nullable(String)` | RefSeq CDS position. |
| `feat_protein_position` | `Nullable(String)` | RefSeq protein position. |
| `feat_target_gene` | `Nullable(String)` | Target gene. |
| `extdb_omim_id` | `Nullable(String)` | OMIM gene id. |
| `extdb_omim_id_url` | `Array(String)` | OMIM links. |
| `extdb_swissprot` | `Nullable(String)` | SwissProt accessions. |
| `extdb_trembl` | `Nullable(String)` | TrEMBL accessions. |
| `extdb_uniparc` | `Nullable(String)` | UniParc accessions. |
| `extdb_uniprot_isoform` | `Nullable(String)` | UniProt isoform accessions. |
| `extdb_orphanet` | `Nullable(String)` | Orphanet gene id. |
| `extdb_orphanet_url` | `Array(String)` | Orphanet links. |
| `extdb_go` | `Nullable(String)` | GO terms associated. |
| `extdb_lovd` | `Nullable(String)` | LOVD variant matching. |
| `extdb_gtex` | `Nullable(String)` | GTEx mapping. |
| `extdb_gtex_url` | `Nullable(String)` | GTEx link. |
| `extdb_cpic` | `Nullable(String)` | Drug — CPIC level. |

## Touched by

| Action | Touch | Notes |
|--------|-------|-------|
| [[analytics.variant.create|analytics::variant::create]] | write | Inserts the record. |
| [[analytics.variant.list|analytics::variant::list]] | read | Queries the current variants (filtered, paginated). |
