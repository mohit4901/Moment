# Pregnancy and postpartum dynamics revealed by millions of lab tests

[https://doi.org/10.5061/dryad.1c59zw44t](https://doi.org/10.5061/dryad.1c59zw44t)
[![DOI](https://zenodo.org/badge/822709739.svg)](https://doi.org/10.5281/zenodo.13996864)

The dataset contains summary statistics on lab tests from >300K pregnancies in Israel in the period 2003-2020 who are members of "Clalit Healthcare", Israel's largest HMO. It spans 110 different tests at weekly resolution.

Where BMI information was available, the measurements were grouped into three: 15-18.5, 18.5-25, and 25-30. These test results are also included in the ungrouped dataset.

In addition, the dataset contains the same information for 3 common complications: Postpartum hemorrhage (PPH), gestational diabetes mellitus (GDM), and pre-eclampsia. The dataset of these pregnancies is brought at a 4-week resolution due to a lower number of measurements.

See *Methods* for more details on dataset curation.

# Description of the data and file structure

Each individual test result was computed as a quantile score from a reference of a healthy, non-pregnant same-aged female population. We retained the participant's age and BMI information if available (before pregnancy).

The queried results were binned into weekly intervals starting 60 weeks before delivery until 80 weeks postpartum.\
For the BMI-grouped  dataset, the data is further binned (see above).
For each such bin with properties (test_name, week [bmi_group]), summary statistics were computed including mean, standard deviation, and the (5,10,25,50,75,90, and 95) percentiles.

The dataset consists of CSV files in the following structure:

```
	- pregnancy.1w/  # Results at 1w resolution, no BMI groups
		- 17_HYDROXY_PROGESTERONE.csv  # Summary statistics on 17α-OHP
		- ACTH_ADRENOCORTICOTROPIC_HORMONE.csv  # Summary statistics on ACTH
		- ⋮
	- pregnancy.2w/  # Results at 2w resolution, no BMI groups
		- ⋮
	- pregnancy.1w.bmi/  # Results at 1w resolution with BMI groups
		- ⋮
	- pregnancy.gdm.4w/  # Pregnancies with a gestational diabetes diagnosis, 4-week resolution
		- ⋮
	- pregnancy.postpartum_hemorrhage.4w/  # Pregnancies with a postpartum hemorrhage diagnosis, 4-week resolution
		- ⋮
	- pregnancy.pre-eclampsia.4w/  # Pregnancies with a pre-eclampsia diagnosis, 4-week resolution
		- ⋮
- stats.csv  # Meta-statistics on each lab test, see below
- complications.csv  # Number of pregnancies per complication
- excluded_icd9_codes.csv  # ICD9 codes of all medical diagnoses excluded, "Chronic disease" as discussed in the methods.
- Metadata.csv # Table of units and test names
- LabNorm.csv  # Reference values from a healthy, non-pregnant female population.
```

## Lab test files

Each CSV file in the directories with the "pregnancy" prefix has the following structure:

| week       | val\_n | val\_mean | val\_sd  | val\_5      | val\_10     | val\_25     | val\_50     | val\_75 | val\_90     | val\_95     | qval\_mean | qval\_sd | qval\_5  | qval\_10 | qval\_25 | qval\_50 | qval\_75 | qval\_90 | qval\_95 | … | bmi\_n | … |
| ---------- | ------ | --------- | -------- | ----------- | ----------- | ----------- | ----------- | ------- | ----------- | ----------- | ---------- | -------- | -------- | -------- | -------- | -------- | -------- | -------- | -------- | - | ------ | - |
| \[-60,-56) | 4668   | 4.274635  | 0.356050 | 3.700000048 | 3.900000095 | 4.099999905 | 4.300000191 | 4.5     | 4.699999809 | 4.800000191 | 0.517748   | 0.300543 | 0.035977 | 0.081233 | 0.279392 | 0.554869 | 0.793191 | 0.924205 | 0.962102 | … | 1376   | … |

*First row from `pregnancy.4w/Albumin.csv`

Where:

* week:  Week of the test relative to delivery (=0).
* val_n: Number of lab tests in the weekly interval.
* val_mean: The mean of all test values in the interval. Units are industry standard and be found in `Metadata.xlsx`
* val_sd: Standard deviation of the test values in the interval.
* val_(5···95) - The (5···95)th percentiles of the test values in the interval, the 50th percentile being the median.
* qval columns: Same as the above for the quantile score of the test results in the interval.
* bmi_n: Number of test results that had a valid BMI measurement.

Other columns (not shown) are age and BMI columns with the same summary statistics.

### Missing Values

Some files are missing some rows where weekly intervals have a single measurement (or None).

Where 1<n≤10, only mean values and median age (per gestational week) are recorded and all other values are replaced with N/A to address privacy concerns.

Full rows where n>10 are not identifiable at the individual level, protecting participants' privacy. The same policy applies to the BMI columns.

## Other files

The file `stats.csv` provides some metadata statistics about the dataset:

* `gw_X` column names are the `X`th percentile of delivery time, unit is gestational week.
* Fraction of first pregnancies was calculated based on the records after 2010 only, since pregnancies before 2002 are not included and therefore we cannot know about earlier pregnancies.
* Preterm pregnancies are those with delivery at or before the 37th gestational week.

`Metadata.csv` maps test names to the file names, and includes other metadata such as physiological system and unit of measurement.

`LabNorm.csv` is stratified to ages and lab tests, each with a reference sampled at 13 points in the distribution. The reference is a healthy (see *Methods* for the definition of healthy), same-aged, and non-pregnant female population.

# Sharing/Access information

Dataset and Juptyer notebooks for analysis are available on GitHub:

* [![GitHub](https://img.icons8.com/ios-glyphs/30/000000/github.png)Pregnancy and postpartum dynamics revealed by millions of lab tests](https://github.com/AlonLabWIS/PregnancyMillions)
* A frozen repository is available on [Zenodo](https://doi.org/10.5281/zenodo.13996864).

Data was curated using the following sources:

* Clalit Healthcare
* [LabNorm R package](https://cran.r-project.org/package=labNorm)

