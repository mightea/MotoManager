# Changelog

## [2026.2.3](https://github.com/mightea/MotoManager/compare/2026.2.2...2026.3.0) (2026-02-22)

### Features

* add last login time to user management in admin panel ([1c004d8](https://github.com/mightea/MotoManager/commit/1c004d830f3093c76a311947adf12424fb6857bf))
* calculate tire age from DOT code for maintenance and insights ([54fea9c](https://github.com/mightea/MotoManager/commit/54fea9c84e12ce01a6177e9f2849e48fabfbe115))
* display app version in settings and re-apply lint fixes ([e112feb](https://github.com/mightea/MotoManager/commit/e112febbb7496f4134e3d8fe5424f0b65e21a551))

## [2026.2.1](https://github.com/mightea/MotoManager/compare/2026.2.1...2026.3.0) (2026-02-22)

### Features

* adds titles ([094cf58](https://github.com/mightea/MotoManager/commit/094cf5887b1183080e49ba789fa57964b4df20b4))
* Adjust header behavior on motorcycle detail pages, making the main header scrollable on mobile and the detail header compact on scroll. ([c76b7f0](https://github.com/mightea/MotoManager/commit/c76b7f06bf3eba00d08ebebe6417920549e59342))
* enhance UI with improved spacing, sizing, and smooth expansion animations for lists and modals. ([91513e8](https://github.com/mightea/MotoManager/commit/91513e87efa408d8de3723f697f1ceb24e6dfca2))

### Bug Fixes

* accessibility, sequential preview regeneration, and sequential DB updates ([51b56ed](https://github.com/mightea/MotoManager/commit/51b56edd412d6bd1e21368dc89ba77d1e5bc1e0a))
* resolve type errors and update project mandates ([db021c6](https://github.com/mightea/MotoManager/commit/db021c61c30b09ef865850f7109a8d76f5db7134))
* satisfy exhaustive-deps lint rule in documents route ([0ca40d2](https://github.com/mightea/MotoManager/commit/0ca40d261b446ed1e50121130f68443f5e50bed5))

### Performance Improvements

* optimize database performance, image delivery, and security ([d653012](https://github.com/mightea/MotoManager/commit/d6530128e4f289dd84226390d813ce58dbb172d3))

## [2026.2.0](https://github.com/mightea/MotoManager/compare/2026.2.0...2026.3.0) (2026-02-15)

### Features

* Add functionality to regenerate all PDF document previews with cross-platform support and a dedicated admin setting. ([a853745](https://github.com/mightea/MotoManager/commit/a853745b02af94f8bbe61608530146c9af5fede4))
* Add script to add `tool_size` column to `torque_specs` table and update DB inspection to focus on `torque_specs`. ([55c47fa](https://github.com/mightea/MotoManager/commit/55c47fa0733779a35eac3b19a2fcb3b576e497b7))
* Implement dynamic currency selection in motorcycle and maintenance forms, fetching currency settings from the database. ([f0f4ef8](https://github.com/mightea/MotoManager/commit/f0f4ef869d203605dedf26a50a0e22816f7c15d5))
* Include currencies in motorcycle detail loader data and update component type usage. ([9a13ca4](https://github.com/mightea/MotoManager/commit/9a13ca4058d98c8b1f91418f97bfeefad0d43354))
* Introduce document privacy and normalized cost tracking, rebase database migrations, and add new database utility scripts. ([4180e63](https://github.com/mightea/MotoManager/commit/4180e630a4207116ca38ccd486696cf1fe43cee6))

### Bug Fixes

* attribute manual odometer readings to the last known activity date. ([539de9e](https://github.com/mightea/MotoManager/commit/539de9e2d37e4d92f8057736d0b63a1f4bc4da2a))
* attribute manual odometer readings to the last known activity date. ([cf5ae9f](https://github.com/mightea/MotoManager/commit/cf5ae9f3e1d4d57a4198f07d39c8263f94fed11a))
* Fall back to cost when normalizedCost is null in maintenance totals ([0930c63](https://github.com/mightea/MotoManager/commit/0930c63c82eaa1bb48bb46729602ccc0f034bc12))
* use explicit null checks in backfill script to handle zero values ([0d5be92](https://github.com/mightea/MotoManager/commit/0d5be92466f9bf7337d857618a95f11168851423))

## [2025.12.0](https://github.com/mightea/MotoManager/compare/2025.11.0...2025.12.0) (2026-02-15)

### Features

* Add a dashboard statistics display to the home page. ([2670779](https://github.com/mightea/MotoManager/commit/2670779514c3d9d53ab93f82b492ec43c134f387))
* Add a new server statistics page displaying key application metrics and counts for various entities. ([379deff](https://github.com/mightea/MotoManager/commit/379deffe1c8b3a3648304f9036189439e168d1f8))
* add admin settings for user and currency management ([eca6e12](https://github.com/mightea/MotoManager/commit/eca6e12a10945c0439e2b6bbd2533b821b8abf67))
* add battery type selection to maintenance form ([1559d8d](https://github.com/mightea/MotoManager/commit/1559d8d3fa13de0268e46a92bbf466c17fea102f))
* add capability to create new torque specifications ([edb1a9b](https://github.com/mightea/MotoManager/commit/edb1a9b3bd1f500d22d2e6dac1995b4783436399))
* add daily cron job for currency updates ([f8a1cfc](https://github.com/mightea/MotoManager/commit/f8a1cfc84d34985ae9ad35f11e71cd87c89133fa))
* add location tracking to maintenance workflow ([e1a0157](https://github.com/mightea/MotoManager/commit/e1a01571294fd6c7e3f4e9da27f2162bd9707c20))
* add maintenance insights to motorcycle detail page ([ad596f6](https://github.com/mightea/MotoManager/commit/ad596f68a49369c5d1855ed0c6ee673f2bf50cbe))
* add maintenance management (add/edit/view) ([741d26d](https://github.com/mightea/MotoManager/commit/741d26de584b64d257a48711eb3fdfa138414478))
* add settings screen for password change and location management ([470d1c6](https://github.com/mightea/MotoManager/commit/470d1c635379900c159dbfc7f9f5e5872d5869bd))
* add tool size field to torque specifications ([40c1e3b](https://github.com/mightea/MotoManager/commit/40c1e3b0b49a1317e7fa5d5c458fd7c43b60c87a))
* add torque specifications page to motorcycle details ([c14affe](https://github.com/mightea/MotoManager/commit/c14affed75fa9eb36e5aa732e2df70aed2b72a1f))
* add utility scripts for Drizzle migration management and database inspection. ([f7ad733](https://github.com/mightea/MotoManager/commit/f7ad733d02bbfb0415e1187647fa93c92fb32006))
* adds image upload and serves from cache ([498ff4b](https://github.com/mightea/MotoManager/commit/498ff4b55a4224c33d6450455993be9e306e892a))
* adds issue crud ([04a65b1](https://github.com/mightea/MotoManager/commit/04a65b17dfbba435aa81cd4109278c06eda09183))
* allow editing of torque specifications ([58a842e](https://github.com/mightea/MotoManager/commit/58a842e6b96b001dd1ad89abdc55e6ded1891d24))
* allow importing torque specs from other motorcycles ([657db12](https://github.com/mightea/MotoManager/commit/657db12b25139cfd2e179b3b45fd454b42526705))
* Centralize and standardize number and currency formatting to use Swiss-style separators across components. ([a193200](https://github.com/mightea/MotoManager/commit/a1932002cabcd6ab5709297279eee6e1551e0d3f))
* display and upload images ([0e5f930](https://github.com/mightea/MotoManager/commit/0e5f930f8536e3556ed24915d237dcb6b79cb84c))
* display motorcycle ownership and usage statistics on the detail page, supported by a new duration formatting utility. ([aebc3a7](https://github.com/mightea/MotoManager/commit/aebc3a766c786f236ffbab90e99df01495a55c20))
* document upload and management ([14172c5](https://github.com/mightea/MotoManager/commit/14172c5a9116f2777d37e4b313132bf7384ebfcc))
* enhance motorcycle detail page header ([9cae3f8](https://github.com/mightea/MotoManager/commit/9cae3f8c4da738d3dd902f16474df209a3f06539))
* expand maintenance item details to full width ([65341c0](https://github.com/mightea/MotoManager/commit/65341c0366eb06cb9bebcb591fe19832c83080c0))
* Extract server-side file handling logic for documents and images into dedicated services. ([d0f8781](https://github.com/mightea/MotoManager/commit/d0f8781317f205dfb916e8eed3186fcf427966ba))
* group maintenance history items ([143a7ab](https://github.com/mightea/MotoManager/commit/143a7ab10e203e56f1a8babe6636ad2f522182b4))
* Implement maintenance record deletion and remove obsolete database inspection scripts. ([584f6aa](https://github.com/mightea/MotoManager/commit/584f6aacc12e1c74b3794f4d1bd558f50f4c8751))
* implements smart scroll-away header on detail pages ([f52a932](https://github.com/mightea/MotoManager/commit/f52a93298dded224c5027e332c9a4b78fc34321f))
* integrate frankfurter api for auto currency rates ([60f9d23](https://github.com/mightea/MotoManager/commit/60f9d239cf2ce6047e8c3f6be6de358c5afc0d84))
* limit currency factor precision in UI to two digits ([5ed2f16](https://github.com/mightea/MotoManager/commit/5ed2f1696881e949d63600f948cd3e6c3ed52741))
* make dialogs full width on mobile ([63ea612](https://github.com/mightea/MotoManager/commit/63ea61203aebb47fdef7f8e381e164e49091b292))
* open issue dialog fixes ([86253c4](https://github.com/mightea/MotoManager/commit/86253c497a7073dc0c8e8468964bd6297bc1f6c0))
* playwright tests, migrations, initial registration ([6d0f953](https://github.com/mightea/MotoManager/commit/6d0f953eceae28d798ce49e63d34df10c300445a))
* refactor maintenance list display ([71e3464](https://github.com/mightea/MotoManager/commit/71e34649dbed356371be8628043f5a50900be08b))
* unifies delete confirmation dialogs ([52ab30e](https://github.com/mightea/MotoManager/commit/52ab30e16f1f5e3d0fffec492455242684b8a5ac))
* update maintenance form type selection and dynamic fields ([7cc80b9](https://github.com/mightea/MotoManager/commit/7cc80b9e63fee95202dd92f2d8d6e7079cf50f2a))
* update maintenance insights to show history (date, duration, kms) instead of due date ([bb15c89](https://github.com/mightea/MotoManager/commit/bb15c89c0bd4cc7c568d46ec25d732f30b532b3e))

### Bug Fixes

* Improve accessibility in torque specification form, refine home stats tests, and update dependencies. ([c7a3829](https://github.com/mightea/MotoManager/commit/c7a38295348553405e337a6e62ed301a82fdc92f))
* invert currency rate for correct conversion direction ([41bb6a5](https://github.com/mightea/MotoManager/commit/41bb6a52d474adcd2940f096ae0706e1897c3da6))
* only show import button if source motorcycles have torque specs ([066781e](https://github.com/mightea/MotoManager/commit/066781e361616e09092b579822c765e19d3f46e3))
* zoom issue on iOS ([2dcd3e4](https://github.com/mightea/MotoManager/commit/2dcd3e45f922d3f14ceb29e67009ca99edad7dcf))

### Reverts

* Revert "feat: improves rendering performance" ([ef05c2e](https://github.com/mightea/MotoManager/commit/ef05c2e2dbf7ae94afa7eec7fd0aff34c73f54a7))
* Revert "feat: adds server side caching" ([ab65156](https://github.com/mightea/MotoManager/commit/ab6515678fb83900e67873f17a8f914bb88dc23c))
* Revert "feat: adds loading indicator" ([15d6caf](https://github.com/mightea/MotoManager/commit/15d6caf25e1db4e9da1481754d54a5438bc05a8a))

## [2025.11.0](https://github.com/mightea/motobase/compare/2025.10.12...2025.11.0) (2025-11-16)

### Features

* adds loading indicator ([ef461c9](https://github.com/mightea/motobase/commit/ef461c9b0085293ac426f3c4074d8f708964067d))
* adds server side caching ([d40f3d9](https://github.com/mightea/motobase/commit/d40f3d9c56c939b25fbd6e84873893cbd1a70707))
* adds server statistics page ([0e15834](https://github.com/mightea/motobase/commit/0e158341ff0c141e38737b7f87a5f6475a382c9d))
* ensures that at least one currency is available ([cbc4b1f](https://github.com/mightea/motobase/commit/cbc4b1ff9c969f0cbc4c72347d75dc9c05b03c39))
* improves rendering performance ([0e22235](https://github.com/mightea/motobase/commit/0e22235a76e04abd87ddf46eef7f36b1bcf105ae))

### Bug Fixes

* corrects post actions on the motorcycle page ([19afae7](https://github.com/mightea/motobase/commit/19afae7548717a008240157e4773263d9e4e8af3))
* fixes dialog sizing issues ([a806bc5](https://github.com/mightea/motobase/commit/a806bc54ab9714f4a4bf47b63fdb861f3f2692c3))

## [2025.10.12](https://github.com/mightea/motobase/compare/2025.10.11...2025.10.12) (2025-10-20)

### Bug Fixes

* fixes migration issue ([315067f](https://github.com/mightea/motobase/commit/315067f78f54949d508a46f9c389d3b1aa1e4034))
* show cross-owner document assignments and fix dialog overflow ([b879389](https://github.com/mightea/motobase/commit/b8793892595dc16f00037c0f7145617842bd3098))

## [2025.11.0](https://github.com/mightea/motobase/compare/2025.10.10...2025.11.0) (2025-10-20)

### Features

* enable importing torque specs between motorcycles ([b119352](https://github.com/mightea/motobase/commit/b119352630d219600e2058f42b3a02b05e654ec2))
* enables importing torque data from all users ([80fbbdd](https://github.com/mightea/motobase/commit/80fbbdd21f96d0147713a9ba69dcf027c0b55ee1))
* enables setting documents to private ([d3414c0](https://github.com/mightea/motobase/commit/d3414c0117901c05c6e6938c5a81c375d5fe6929))

### Bug Fixes

* fixes dialog height on tablet and above ([49ae799](https://github.com/mightea/motobase/commit/49ae799cc35e6364692a605096f110c1c6feb867))

## [2025.10.10](https://github.com/mightea/motobase/compare/2025.10.9...2025.10.10) (2025-10-20)

### Bug Fixes

* The App version is now defined as an env variable ([0ec46b6](https://github.com/mightea/motobase/commit/0ec46b6f861a3b07ef8141d877a7e1433bf98674))

## [2025.10.9](https://github.com/mightea/motobase/compare/2025.10.8...2025.10.9) (2025-10-19)

### Features

* adds release-it ([8155167](https://github.com/mightea/motobase/commit/8155167ef4467a83721f88e08375ce656b3f3824))

### Bug Fixes

* post to invalid routes on the motorcycle page ([58886d8](https://github.com/mightea/motobase/commit/58886d8569f7b90d1ed88ca708ff97dcb54356fa))
