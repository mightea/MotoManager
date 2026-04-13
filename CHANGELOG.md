# Changelog

## [2026.4.6](https://github.com/mightea/MotoManager/compare/2026.4.5...2026.4.6) (2026-04-13)

### Features

* add dealership location and coordinates to service maintenance items ([54f075a](https://github.com/mightea/MotoManager/commit/54f075af2335c777d11753ba01135cfcee77bcc2))
* display app version in login footer ([f60157d](https://github.com/mightea/MotoManager/commit/f60157df3d9d6001b05fb38d2148dd354e8ebd06))
* implement selectable service locations from previous records ([5768514](https://github.com/mightea/MotoManager/commit/5768514a89525c6f753c34083c95ec57c1f9d3c9))
* improve maintenance form and list to show optional fields and bundled items during edit ([e9e6ad3](https://github.com/mightea/MotoManager/commit/e9e6ad353f65e93f0e8f44190309308ea9c15ae0))
* improve maintenance location management and service detail view ([4e85a0c](https://github.com/mightea/MotoManager/commit/4e85a0c1ceb573bc645118afcc1b29ba40ee14d0))
* remove make and model fields from service items and cleanup dialog props ([fbc6b56](https://github.com/mightea/MotoManager/commit/fbc6b5605af2de35ab242556f727ce642929a4fc))
* restrict optional fields to service type in maintenance form and list ([9c7298f](https://github.com/mightea/MotoManager/commit/9c7298f4841ff44622d778ff427d5112a6de7704))
* use busiestBike field for home page stats card ([86f6250](https://github.com/mightea/MotoManager/commit/86f6250a41291932e288e35d79008c75a7518065))
* use direct backend URLs for document downloads and ensure consistency ([9324a0e](https://github.com/mightea/MotoManager/commit/9324a0e92d3069bf6d50b7ffeca9227dc84d6a44))

### Bug Fixes

* ensure login/logout routes handle server-side requests and reloads ([3645436](https://github.com/mightea/MotoManager/commit/36454368992f32b72f7188ab3d864d26e2487ae4))
* ensure maintenance location dropdown shows by default when locations exist ([d1eaf62](https://github.com/mightea/MotoManager/commit/d1eaf621d6a94259a2b78150b19b0e4e0c55e4de))
* handle busiestBike as string in dashboard stats ([17a954a](https://github.com/mightea/MotoManager/commit/17a954ab85de14727e38b41d52fae47b49534ae2))
* handle capitalized property names for busiest bike stats ([ea80309](https://github.com/mightea/MotoManager/commit/ea80309702d16e826c2a5821b28cd00bd1a13af1))
* remove incorrect api prefix from backend asset urls ([c9143c5](https://github.com/mightea/MotoManager/commit/c9143c516c8fa6ca0d6b939239dbfce7b23123f3))
* resolve 404 on login reload by fixing greedy proxy and synchronizing loaders ([bd3a31c](https://github.com/mightea/MotoManager/commit/bd3a31c26a8dc99089fad0ceb7a4e947ae9ec0e3))
* support snake_case property names from backend in dashboard stats ([2611fe4](https://github.com/mightea/MotoManager/commit/2611fe4ab0440b1865ed08c7898d8572515ba001))

## [2026.4.5](https://github.com/mightea/MotoManager/compare/2026.4.4...2026.4.5) (2026-04-12)

### Bug Fixes

* ensure environment variables are truly dynamic at runtime ([056f492](https://github.com/mightea/MotoManager/commit/056f492f0796f0f1d49f225467595ad70b68a2c3))

## [2026.4.4](https://github.com/mightea/MotoManager/compare/2026.4.3...2026.4.4) (2026-04-12)

### Bug Fixes

* ensure all image paths use the public backend URL ([731d192](https://github.com/mightea/MotoManager/commit/731d19270cd8027cd417bb510691a4988c1853fd))
* implement authenticated document downloads ([6a112a0](https://github.com/mightea/MotoManager/commit/6a112a0364a7a59a2e8e7818c4a36955e9539014))

## [2026.4.3](https://github.com/mightea/MotoManager/compare/2026.4.2...2026.4.3) (2026-04-12)

### Bug Fixes

* enhance proxy stability and support internal docker networking ([7c927f0](https://github.com/mightea/MotoManager/commit/7c927f061826bf3286348af3e2ac152236485437))

## [2026.4.2](https://github.com/mightea/MotoManager/compare/2026.4.1...2026.4.2) (2026-04-12)

### Bug Fixes

* implement robust server-side proxying for all API calls to avoid production CORS issues ([68ca9d2](https://github.com/mightea/MotoManager/commit/68ca9d2b47eb29822ecbfd8ed23139545d8f4da2))

## [2026.4.1](https://github.com/mightea/MotoManager/compare/2026.4.0...2026.4.1) (2026-04-12)

### Bug Fixes

* enable absolute backend URLs and runtime environment injection ([c42cebd](https://github.com/mightea/MotoManager/commit/c42cebd32aedbc760b9a550976a68334e16755f6))

## [2026.4.0](https://github.com/mightea/MotoManager/compare/2026.3.1...2026.4.0) (2026-04-11)

### Features

* disable add motorcycle and document buttons when offline ([4f5a15a](https://github.com/mightea/MotoManager/commit/4f5a15a90817a1b053992ee6455501c81dfd9877))
* enable offline data entry for issues/maintenance with auto-sync ([6843213](https://github.com/mightea/MotoManager/commit/6843213cacd6304e42ec092be9cefbd65108a655))
* enable offline torque specs management with auto-sync ([210fd75](https://github.com/mightea/MotoManager/commit/210fd75415f2c14d0f9eb7bc9022709b8d8f86eb))
* enhance frontend UX with skeletons, refactored forms, and loading states ([0972696](https://github.com/mightea/MotoManager/commit/097269668b938c74113221a4a250d22e11591551))
* improve image cropping quality and resolution ([e46f34b](https://github.com/mightea/MotoManager/commit/e46f34b373091098286611d53fe0f84b3af31267))
* improve offline mode with auth caching and better error handling ([f46b787](https://github.com/mightea/MotoManager/commit/f46b787c629e9e4a8b5e4439c4ed1fa4917007d5))
* migrate to external backend and remove local database ([8c42f62](https://github.com/mightea/MotoManager/commit/8c42f62424c25a14e04e769a9d11504f55818bbb))
* move server statistics link to admin area ([dbf95a3](https://github.com/mightea/MotoManager/commit/dbf95a34789a176da6afe9d354b45bc67c5a59c6))
* refactor to client-side rendered SPA and offline-capable PWA ([2e3043e](https://github.com/mightea/MotoManager/commit/2e3043eb5a5776419984559fed8892feb393e130))
* show changelog only for logged in users and fix lint issues ([a7a831e](https://github.com/mightea/MotoManager/commit/a7a831e5c4ae5b65f743620ff719c0902c42f6c8))
* update home dashboard to use /home endpoint and cleanup passkey routes ([c365bc4](https://github.com/mightea/MotoManager/commit/c365bc45b8f33a2cbd4b3c236c63b0b64cb7f4a2))

### Bug Fixes

* allow passkey login without specifying a username ([7c7505d](https://github.com/mightea/MotoManager/commit/7c7505d17e7ec6e785353b280593ac0edc690261))
* correctly pass nested publicKey to simplewebauthn library ([d4b32c4](https://github.com/mightea/MotoManager/commit/d4b32c424e14125cfdd71797369fc1d0a71f2518))
* enable SSR to support server-side resource routes and fix production build ([b7addb8](https://github.com/mightea/MotoManager/commit/b7addb849a2ce21271a9f0b962ee88f0ede7f537))
* ensure offline cache is properly cleaned by using syncCache for lists ([4e69f20](https://github.com/mightea/MotoManager/commit/4e69f206a3a14c1364d0f501361467aa822b0779))
* ensure UI updates after sync and prevent duplicate entries ([e498ff6](https://github.com/mightea/MotoManager/commit/e498ff6281456d6b8c801c3ad1d18cd7b0012974))
* prevent duplicate entries during sync and ensure surgical cache updates ([4c945ce](https://github.com/mightea/MotoManager/commit/4c945ceca4daf94a4c45de7d3206fe781c141121))
* prevent white screen on reload by adding HydrateFallback and safety checks ([faaa6cf](https://github.com/mightea/MotoManager/commit/faaa6cfe90b32fc7bc928e4526fe625cbba2bddc))
* resolve passkey JSON error and refine proxy implementation ([08a184b](https://github.com/mightea/MotoManager/commit/08a184be81888c3f783026e7dbbce0a9a622f807))
* resolve passkey JSON error by using Vite proxy and relative paths ([4b61788](https://github.com/mightea/MotoManager/commit/4b617886edb9a5e13e9e4ae64ef2084fd5e32f74))
* resolve TypeError in maintenance form and improve currency handling ([a473fac](https://github.com/mightea/MotoManager/commit/a473fac7133d644e251a0ba4e3b360241a90b2ce))
* resolve TypeErrors and restore missing data in documents and statistics ([4858372](https://github.com/mightea/MotoManager/commit/4858372dbd34145b1491a9d5116f0c43a187e4d2))
* restore passkey proxy routes for local development compatibility ([6ed1f60](https://github.com/mightea/MotoManager/commit/6ed1f6000a33de6518b373b650a4c3ae9c3959ad))
* settings page recovery and improved offline logging ([6362ff9](https://github.com/mightea/MotoManager/commit/6362ff9aad11c466a8db6a4d0bca22ecb24f1c59))
* use 127.0.0.1 for proxy and add safety checks for passkey options ([7151f5d](https://github.com/mightea/MotoManager/commit/7151f5d8c6893a12e3b4769e51de237e5372ed83))

### Performance Improvements

* use server-aggregated stats and improve dashboard resilience ([f19ab5c](https://github.com/mightea/MotoManager/commit/f19ab5cb6bf64ba91581e4ebb04b6fa77a060c32))

## [2026.3.1](https://github.com/mightea/MotoManager/compare/2026.3.0...2026.3.1) (2026-03-12)

### Features

* add country code to locations and use for homepage sorting ([1cf48b8](https://github.com/mightea/MotoManager/commit/1cf48b88446b178892a49b271e0c211af015b83c))
* display changelog on new release ([583329b](https://github.com/mightea/MotoManager/commit/583329bf9e263de2ecc82fdc14e9beb1c593cf35))

### Bug Fixes

* allow saving 4-digit year as fabrication date ([7e93ef7](https://github.com/mightea/MotoManager/commit/7e93ef7a3dcdd9ce59dd9ddf2e9dbf818d736d33))
* fix badge z-index and positioning on motorcycle card ([01b0d94](https://github.com/mightea/MotoManager/commit/01b0d94a546656105d2ff19a9973d9d7536e9ac8))

## [2026.3.0](https://github.com/mightea/MotoManager/compare/2026.2.9...2026.3.0) (2026-03-09)

### Features

* add filtering to maintenance list ([d89ad64](https://github.com/mightea/MotoManager/commit/d89ad64a196dac49e63aefe3e335622671a9ab55))
* add fuel recording to maintenance history with map integration ([b88ff4d](https://github.com/mightea/MotoManager/commit/b88ff4de3106293dbbd8679102d168d6813f9ac7))
* add fuel tank size and estimated range calculation ([8bbe69f](https://github.com/mightea/MotoManager/commit/8bbe69f3dff86a19256841d26f870dbb11e717df))
* add interactive map picker and location autocomplete for fuel entries ([332ab43](https://github.com/mightea/MotoManager/commit/332ab4305a665d1824b6099071b2df9b37a4ebef))
* add RoadTrip fuel data import ([a06e820](https://github.com/mightea/MotoManager/commit/a06e82067e3cc270eff21f752898a7d8e5fcb3ca))
* automatic fuel consumption and trip calculations ([7ae2f74](https://github.com/mightea/MotoManager/commit/7ae2f742b8281cc80cb55c80201dff38de36230c))
* display dual currencies for international maintenance items ([1845207](https://github.com/mightea/MotoManager/commit/184520727b5e7475c50cc3898e0d2872373ae320))
* enable cross-user document assignment ([479fef0](https://github.com/mightea/MotoManager/commit/479fef0d0dba68b7cc72e1f521fd17c4aedeffdd))
* enhance RoadTrip import with currency and location support ([628c430](https://github.com/mightea/MotoManager/commit/628c4303c0bdd6be4e237f0ac6857acd261e4ea7))
* improve fuel entry descriptions and auto-populate metadata ([0a46a16](https://github.com/mightea/MotoManager/commit/0a46a165c5f31abfbb80cdea9a6c960d411bb6f0))
* set fuel as default type in maintenance form ([78428f4](https://github.com/mightea/MotoManager/commit/78428f42b5ac69830a131acf60538de495b17964))
* use short identifiers for fuel types and display verbose labels ([aabb961](https://github.com/mightea/MotoManager/commit/aabb96115b48d605a116ec22731c2cfd3deea9f9))

### Bug Fixes

* address PR review comments on accessibility, delete button, and transaction error handling ([7b81d8b](https://github.com/mightea/MotoManager/commit/7b81d8bc26397978d1e840e62922e93902beb6da))
* correctly format currency in RoadTrip import preview ([9b1a2a5](https://github.com/mightea/MotoManager/commit/9b1a2a5a832bc046a6af0d09f2b393d9a04f8024))
* ensure Leaflet map is removed in MapPicker cleanup ([3c20b54](https://github.com/mightea/MotoManager/commit/3c20b5429b0b8c14a26d0484947b72937df9771d))
* ensure map visibility in edit dialog and improve picker robustness ([e1fcfa7](https://github.com/mightea/MotoManager/commit/e1fcfa71432630e6135b1046260a730c1824d108))
* improve RoadTrip CSV date parsing ([49e0345](https://github.com/mightea/MotoManager/commit/49e0345197fe7b90d0e2fa97d584690caadebc3b))
* make MapPicker SSR-safe by using dynamic imports for Leaflet ([3a201a3](https://github.com/mightea/MotoManager/commit/3a201a39ac57d277992c024fef1eeb5ddfdf9b1d))
* only show normalized cost in maintenance list when available ([d66178c](https://github.com/mightea/MotoManager/commit/d66178cd9c96531f37214b0f4cb8c9e87592ce1b))
* prevent recalculateFuelConsumption from modifying descriptions ([725980f](https://github.com/mightea/MotoManager/commit/725980f9f09547b45f355ecfe277c538d503e76b))
* prevent theme flash by applying class on server-side ([bd25dfd](https://github.com/mightea/MotoManager/commit/bd25dfd97390c50d590d8a4471fc596dd172e2b9))
* resolve empty map rendering in MapPicker modal ([e012a7d](https://github.com/mightea/MotoManager/commit/e012a7d0a7b61108da310d9592c5db81e5a29ed1))
* resolve hydration crash and fix mangled action logic ([ce74e0d](https://github.com/mightea/MotoManager/commit/ce74e0d47f625fa7159d973033b6970936655997))
* restrict location autocomplete to fuel entries only ([e82bf43](https://github.com/mightea/MotoManager/commit/e82bf43f9cd48a8c376564732815c3aaf7f7b2b7))

### Performance Improvements

* optimize fuel consumption recalculation with transaction and change check ([66ae460](https://github.com/mightea/MotoManager/commit/66ae460654669f6c2b43c1716fe5f6536a458e58))

## [2026.2.9](https://github.com/mightea/MotoManager/compare/2026.2.8...2026.2.9) (2026-02-26)

### Features

* implement robust offline read-only mode for PWA ([af81bc1](https://github.com/mightea/MotoManager/commit/af81bc1ca3a27eb55fd49fdfc6328f4cd60421f3))
* remove all PWA and offline mode related code ([3d23f4e](https://github.com/mightea/MotoManager/commit/3d23f4ecfe64a388db9b69c94c44b1fa147f038e))

### Bug Fixes

* ensure previous owners list updates automatically after save ([4d7b693](https://github.com/mightea/MotoManager/commit/4d7b6936422b85e70cc4b0b5f37bae3652713fa1))
* improve Service Worker and data caching for better offline stability ([a18caf3](https://github.com/mightea/MotoManager/commit/a18caf35c433ac8464bd089a3f7000c61d951ba1))
* make useIsOffline hook SSR-safe by removing .client suffix ([2743370](https://github.com/mightea/MotoManager/commit/2743370d2a399554c13e7eead25a1f659f4cfd48))
* resolve missing imports and undefined variables ([60a7121](https://github.com/mightea/MotoManager/commit/60a712135dc6997f10c51143630f0c1b750199fa))

## [2026.2.8](https://github.com/mightea/MotoManager/compare/2026.2.7...2026.2.8) (2026-02-25)

### Features

* add ability to record and manage previous owners for motorcycles ([a102fda](https://github.com/mightea/MotoManager/commit/a102fda3ca8c42825ab886172e0deb2e97ee467e))
* implement offline support with PWA manifest, service worker, and real-time status indicator ([603096a](https://github.com/mightea/MotoManager/commit/603096a6f4aca540bd07a5d7d6754faf2cea1515))

### Bug Fixes

* add PNG icons to PWA manifest for better platform compatibility ([a4839c5](https://github.com/mightea/MotoManager/commit/a4839c500e54fad8ee27432c186552a5082672bc))
* apply PWA review feedback - cache cleanup, error handling, and SW registration ([7d1680d](https://github.com/mightea/MotoManager/commit/7d1680d8d56b1940405c784090aadb2fbce2536c))
* update tests to match new cache key and offline error behavior ([1bce1ce](https://github.com/mightea/MotoManager/commit/1bce1ce17bccc63b2a1086dea369ea4bb4b2adf5))

## [2026.2.7](https://github.com/mightea/MotoManager/compare/2026.2.6...2026.2.7) (2026-02-24)

### Features

* add optional kilometer-based maintenance intervals ([164a203](https://github.com/mightea/MotoManager/commit/164a203fd946c2d43c07bac4b0f3cf5d580778c7))
* add user-configurable maintenance intervals for fork oil, brake fluid, and coolant ([93a83a7](https://github.com/mightea/MotoManager/commit/93a83a77a22588af6b02ba5020ae348f67f57e4e))
* ensure all configured maintenance types are listed in insights even without history ([3b29c85](https://github.com/mightea/MotoManager/commit/3b29c85e1ffa39403cde1c793330bd111445a5d7))
* make maintenance intervals configurable for each user ([ad70a83](https://github.com/mightea/MotoManager/commit/ad70a83a0499e2a058c33ea74ad11e5111ece783))
* rename model year to fabrication date and support MM/YYYY format ([77f721e](https://github.com/mightea/MotoManager/commit/77f721e9812411372587699ee4b617ee0175a2e8))

### Bug Fixes

* correct kmsSinceLast calculation when odometer data is missing or invalid ([bb7cc4b](https://github.com/mightea/MotoManager/commit/bb7cc4b1080c022aa91b955e6f09d61cf197c578))
* hide maintenance intervals if no previous data exists ([ca67080](https://github.com/mightea/MotoManager/commit/ca670801fa971b46e6d13c9e00ebacfec3b7ae54))
* resolve black box issue in torque specifications print layout ([cc4b3e4](https://github.com/mightea/MotoManager/commit/cc4b3e478bb468a0eb9d27fa298154979b6179cb))
* resolve ReferenceErrors and missing imports in maintenance intervals implementation ([790e1f6](https://github.com/mightea/MotoManager/commit/790e1f6500a485a2dd75c9b959da4816c22401c7))

## [2026.2.6](https://github.com/mightea/MotoManager/compare/2026.2.5...2026.2.6) (2026-02-23)

### Features

* implement comprehensive user management in admin panel ([9561079](https://github.com/mightea/MotoManager/commit/95610796a989bf408f1c8d82d0611c3390e9e90f))
* move settings to user dropdown in header ([83e74bb](https://github.com/mightea/MotoManager/commit/83e74bbcbe878ae19395f772f90a7eb4802f2427))

### Bug Fixes

* allow user dropdown to be visible by removing overflow-hidden from header ([1d021a0](https://github.com/mightea/MotoManager/commit/1d021a004a5e613ad4cd5d29d1cc8686926222d0))
* ensure torque spec text is black when printing ([81dcd73](https://github.com/mightea/MotoManager/commit/81dcd739dbe149aec68fa6756a35c387822df63d))
* further improve print styles for torque specs to ensure visibility ([bda9b0d](https://github.com/mightea/MotoManager/commit/bda9b0d16afda8f18791bb80e06637a993ce0b46))

## [2026.2.5](https://github.com/mightea/MotoManager/compare/2026.2.4...2026.2.5) (2026-02-23)

### Features

* add delete functionality to torque specifications with confirmation dialog ([ee678ff](https://github.com/mightea/MotoManager/commit/ee678ff8c540536382481e7c11adf9c422753cb4))
* add optimized print view for torque specifications with technical motorcycle data ([05eb7ec](https://github.com/mightea/MotoManager/commit/05eb7ec67068819394eac02ab0541f200f721a4a))
* implement passkey (WebAuthn) support for faster and more secure logins ([975a0f7](https://github.com/mightea/MotoManager/commit/975a0f7961e484b9ac3228233b732eefcc477c98))
* provide category suggestions in torque spec form using existing entries ([5e336b7](https://github.com/mightea/MotoManager/commit/5e336b7a3851be0032cec512119fb01e3ecc8fdd))

### Bug Fixes

* improve torque specification print stylesheet and ignore root PNGs ([fa96fc8](https://github.com/mightea/MotoManager/commit/fa96fc8bbc0a4946484f51051c29654842053129))

## [2026.2.4](https://github.com/mightea/MotoManager/compare/2026.2.3...2026.2.4) (2026-02-22)

### Features

* add fleet statistics page with yearly development data ([d07cb3f](https://github.com/mightea/MotoManager/commit/d07cb3fa8f2af97d086a05cc59b83a3712ddf40b))
* group all maintenance and fleet data by year ([1892df4](https://github.com/mightea/MotoManager/commit/1892df4cde5ff6dec31691bbd71f7aa566ddc1e3))
* improve maintenance record descriptions in list ([79146a8](https://github.com/mightea/MotoManager/commit/79146a8576777a77227785b4191a055da73a64e2))

### Bug Fixes

* docker build by forcing corepack installation to ([60f2c1e](https://github.com/mightea/MotoManager/commit/60f2c1e8072c175e942e94d954514d5bd450c8a7))
* docker build error by installing corepack via npm ([dc72ec1](https://github.com/mightea/MotoManager/commit/dc72ec16e9b5baaed1ce98a06f047e3e70596b77))
* proper version noting in changelog by disabling recommended bump in conventional-changelog plugin ([e4708d2](https://github.com/mightea/MotoManager/commit/e4708d287ff8390e7bf4f29ffc58b41741341712))

## [2026.2.3](https://github.com/mightea/MotoManager/compare/2026.2.2...2026.2.3) (2026-02-22)

### Features

* add last login time to user management in admin panel ([1c004d8](https://github.com/mightea/MotoManager/commit/1c004d830f3093c76a311947adf12424fb6857bf))
* calculate tire age from DOT code for maintenance and insights ([54fea9c](https://github.com/mightea/MotoManager/commit/54fea9c84e12ce01a6177e9f2849e48fabfbe115))
* display app version in settings and re-apply lint fixes ([e112feb](https://github.com/mightea/MotoManager/commit/e112febbb7496f4134e3d8fe5424f0b65e21a551))

## [2026.2.1](https://github.com/mightea/MotoManager/compare/2026.2.0...2026.2.1) (2026-02-22)

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

## [2026.2.0](https://github.com/mightea/MotoManager/compare/2025.12.0...2026.2.0) (2026-02-15)

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
