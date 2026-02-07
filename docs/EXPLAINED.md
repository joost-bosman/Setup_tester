# Setup_tester - Explained

## Table of Contents / Inhoudsopgave
- English (UK)
- Nederlands
- Hindi
- Arabic
- Polski
- Ukrainian
- Français
- Português
- Español
- Italiano
- Bahasa Indonesia

---
## English (UK)

### Quick Start (Step-by-step)
1. Choose your language on the first screen.
2. Select **Brief** for quick readiness or **Extensive** for maximum performance checks.
3. (Optional) Enable **Software/IDEs** and **Tools & Languages** if you want those scans.
4. Click **Run diagnostics** and wait for results.
5. Review **Optimization suggestions** and export to TXT/PDF if needed.

### Flow (visual)
```
[Choose Language] -> [Select Mode + Extras] -> [Run Diagnostics] -> [Results + Suggestions] -> [Export]
```

### What the tool checks
- OS, CPU, RAM, GPU, Internet speed/latency
- Optional: installed IDEs, tools, and languages
- Optional: network details and power plan (extensive mode)

### Language support
- UI and reports are multi-language.
- Auto-detect uses the IP region; English (UK) is the default fallback.

### Suggestions logic
- Brief mode: focuses on readiness to start working.
- Extensive mode: focuses on performance and efficiency gains.

### Export
- TXT, PDF, JSON, and CSV exports include results + suggestions.
- Filenames are timestamped for easy tracking.

### Summary and baseline
- Each run includes a health score and top priorities.
- Save a baseline and compare later runs to spot changes.

### Privacy & network
- Diagnostics are local.
- Exports are saved locally (default: your Downloads folder) and are not sent anywhere.
- Network paths are blocked for exports/baselines to keep data local.
- Extra attention was paid to keep exports local-only.
- No telemetry or upload of diagnostics; only the optional speed test sends synthetic traffic to test endpoints.
- Language auto-detect uses IP to infer country; nothing is stored.

### Download optimization tips (for better adoption)
- Provide a clear changelog and screenshots.
- Keep installers small and signed.
- Add a short "first run" guide in the README.
- Offer both portable and installer options when possible.
- Publish hashes for integrity checks.

### Build output folders
- Windows output: dist/windows/
- macOS output: dist/macos/

---

## Nederlands

### Snel starten (stap-voor-stap)
1. Kies je taal op het eerste scherm.
2. Kies **Kort** voor snelle gereedheid of **Uitgebreid** voor maximale prestatiechecks.
3. (Optioneel) Zet **Software/IDEs** en **Tools & talen** aan voor extra scans.
4. Klik **Diagnose uitvoeren** en wacht op de resultaten.
5. Bekijk **Optimalisatiesuggesties** en exporteer naar TXT/PDF indien nodig.

### Flow (visueel)
```
[Taal kiezen] -> [Modus + Extra's] -> [Diagnose] -> [Resultaten + Suggesties] -> [Export]
```

### Wat de tool controleert
- OS, CPU, RAM, GPU, internetsnelheid/latentie
- Optioneel: geïnstalleerde IDE's, tools en talen
- Optioneel: netwerkdetails en energieplan (uitgebreid)

### Suggestielogica
- Kort: gericht op snel kunnen starten.
- Uitgebreid: gericht op maximale prestaties en efficiëntie.

### Export
- TXT, PDF, JSON en CSV bevatten resultaten + suggesties.

### Privacy & netwerk
- Diagnoses zijn lokaal.
- Exports worden lokaal opgeslagen (standaard: je Downloads-map) en worden nergens heen gestuurd.
- Netwerkpaden zijn geblokkeerd voor exports/baselines om data lokaal te houden.
- Er is extra aandacht besteed aan het lokaal houden van exports.
- Geen telemetrie of upload van diagnoses; alleen de optionele snelheidstest stuurt synthetisch testverkeer naar test-endpoints.
- Taaldetectie gebruikt IP voor regio; er wordt niets opgeslagen.

### Download-optimalisatietips
- Duidelijke changelog en screenshots.
- Houd installers klein en ondertekend.
- Voeg een korte "first run"-gids toe.
- Bied portable en installer-opties waar mogelijk.
- Publiceer hashes voor integriteitscontrole.

---

## Hindi

### त्वरित शुरुआत (चरण-दर-चरण)
1. पहली स्क्रीन पर अपनी भाषा चुनें।
2. जल्दी जाँच के लिए **Brief** या अधिकतम प्रदर्शन के लिए **Extensive** चुनें।
3. (वैकल्पिक) अगर आप वे स्कैन चाहते हैं तो **Software/IDEs** और **Tools & Languages** सक्षम करें।
4. **Run diagnostics** पर क्लिक करें और परिणामों की प्रतीक्षा करें।
5. **Optimization suggestions** देखें और आवश्यकता हो तो TXT/PDF में निर्यात करें।

### प्रवाह (दृश्य)
```
[Choose Language] -> [Select Mode + Extras] -> [Run Diagnostics] -> [Results + Suggestions] -> [Export]
```

### टूल क्या जाँचता है
- OS, CPU, RAM, GPU, इंटरनेट गति/लेटेंसी
- वैकल्पिक: इंस्टॉल किए गए IDEs, टूल्स और भाषाएँ
- वैकल्पिक: नेटवर्क विवरण और पावर प्लान (extensive मोड)

### सुझावों का तर्क
- Brief मोड: काम शुरू करने की तत्परता पर फोकस।
- Extensive मोड: प्रदर्शन और दक्षता बढ़ाने पर फोकस।

### Export
- TXT, PDF, JSON और CSV exports में results + suggestions शामिल होते हैं।
- फ़ाइल नाम समय-स्टैम्प के साथ बनते हैं।

### सारांश और बेसलाइन
- हर रन में health score और top priorities शामिल होते हैं।
- बेसलाइन सेव करें और बाद की runs से तुलना करें।

### गोपनीयता और नेटवर्क
- Diagnostics स्थानीय हैं।
- Exports स्थानीय रूप से सेव होते हैं (डिफ़ॉल्ट: आपका Downloads फ़ोल्डर) और कहीं नहीं भेजे जाते।
- डेटा को स्थानीय रखने के लिए exports/baselines पर नेटवर्क पाथ ब्लॉक होते हैं।
- कोई telemetry या diagnostics upload नहीं; केवल वैकल्पिक speed test टेस्ट endpoints पर synthetic ट्रैफ़िक भेजता है।
- भाषा auto-detect के लिए IP region का उपयोग होता है; कुछ भी स्टोर नहीं होता।

### Download optimization tips
- स्पष्ट changelog और screenshots दें।
- Installers छोटे और signed रखें।
- README में छोटा "first run" guide जोड़ें।
- जहाँ संभव हो portable और installer दोनों विकल्प दें।
- integrity के लिए hashes प्रकाशित करें।

---
## Arabic

### بدء سريع (خطوة بخطوة)
1. اختر لغتك في الشاشة الأولى.
2. اختر **Brief** للاستعداد السريع أو **Extensive** لأقصى فحوصات الأداء.
3. (اختياري) فعِّل **Software/IDEs** و **Tools & Languages** إذا كنت تريد هذه الفحوصات.
4. انقر **Run diagnostics** وانتظر النتائج.
5. راجع **Optimization suggestions** وقم بالتصدير إلى TXT/PDF عند الحاجة.

### المسار (تصويري)
```
[Choose Language] -> [Select Mode + Extras] -> [Run Diagnostics] -> [Results + Suggestions] -> [Export]
```

### ما الذي يفحصه الأداة
- OS, CPU, RAM, GPU، سرعة الإنترنت/الكمون
- اختياري: IDEs، الأدوات واللغات المثبتة
- اختياري: تفاصيل الشبكة وخطة الطاقة (وضع extensive)

### منطق الاقتراحات
- وضع Brief: يركّز على الجاهزية للبدء.
- وضع Extensive: يركّز على تحسين الأداء والكفاءة.

### Export
- تشمل صادرات TXT وPDF وJSON وCSV النتائج + الاقتراحات.
- أسماء الملفات تحمل طابعًا زمنيًا.

### الملخص وخط الأساس
- كل تشغيل يتضمن health score وأهم الأولويات.
- احفظ baseline وقارنه مع تشغيلات لاحقة لرصد التغييرات.

### الخصوصية والشبكة
- التشخيصات محلية.
- يتم حفظ الصادرات محليًا (افتراضيًا: مجلد Downloads) ولا يتم إرسالها إلى أي مكان.
- يتم حظر مسارات الشبكة للصادرات/الأساسيات للحفاظ على بقاء البيانات محليًا.
- لا توجد telemetry أو رفع للتشخيصات؛ فقط اختبار السرعة الاختياري يرسل حركة اصطناعية إلى نقاط الاختبار.
- الكشف التلقائي للغة يستخدم منطقة الـ IP؛ ولا يتم حفظ أي شيء.

### نصائح تحسين التنزيل
- قدّم changelog واضحًا ولقطات شاشة.
- اجعل installers صغيرة وموقَّعة.
- أضف دليل "first run" قصيرًا في README.
- قدّم خيارات portable و installer عندما يكون ذلك ممكنًا.
- انشر hashes للتحقق من السلامة.

---
## Polski

### Szybki start (krok po kroku)
1. Wybierz język na pierwszym ekranie.
2. Wybierz **Brief** dla szybkiej gotowości lub **Extensive** dla maksymalnych testów wydajności.
3. (Opcjonalnie) Włącz **Software/IDEs** i **Tools & Languages**, jeśli chcesz tych skanów.
4. Kliknij **Run diagnostics** i poczekaj na wyniki.
5. Sprawdź **Optimization suggestions** i wyeksportuj do TXT/PDF, jeśli potrzebujesz.

### Przepływ (wizualnie)
```
[Choose Language] -> [Select Mode + Extras] -> [Run Diagnostics] -> [Results + Suggestions] -> [Export]
```

### Co sprawdza narzędzie
- OS, CPU, RAM, GPU, prędkość/latencja internetu
- Opcjonalnie: zainstalowane IDE, narzędzia i języki
- Opcjonalnie: szczegóły sieci i plan zasilania (tryb extensive)

### Logika sugestii
- Tryb Brief: skupia się na gotowości do pracy.
- Tryb Extensive: skupia się na wydajności i efektywności.

### Export
- Eksporty TXT, PDF, JSON i CSV zawierają wyniki + sugestie.
- Nazwy plików zawierają znacznik czasu.

### Podsumowanie i baseline
- Każde uruchomienie zawiera health score i top priorities.
- Zapisz baseline i porównuj z kolejnymi uruchomieniami.

### Prywatność i sieć
- Diagnostyka jest lokalna.
- Eksporty są zapisywane lokalnie (domyślnie: folder Downloads) i nigdzie nie są wysyłane.
- Ścieżki sieciowe są blokowane dla eksportów/baselines, aby dane pozostały lokalnie.
- Brak telemetry lub wysyłania diagnostyki; tylko opcjonalny test prędkości wysyła ruch testowy do endpointów.
- Automatyczne wykrywanie języka używa regionu IP; nic nie jest zapisywane.

### Wskazówki optymalizacji pobierania
- Zapewnij czytelny changelog i zrzuty ekranu.
- Utrzymuj installers małe i podpisane.
- Dodaj krótki przewodnik "first run" w README.
- Oferuj wersję portable i installer, jeśli to możliwe.
- Publikuj hashes do weryfikacji integralności.

---
## Ukrainian

### Швидкий старт (крок за кроком)
1. Виберіть мову на першому екрані.
2. Оберіть **Brief** для швидкої перевірки або **Extensive** для максимальних тестів продуктивності.
3. (Опційно) Увімкніть **Software/IDEs** і **Tools & Languages**, якщо потрібні ці скани.
4. Натисніть **Run diagnostics** і зачекайте на результати.
5. Перегляньте **Optimization suggestions** і за потреби експортуйте у TXT/PDF.

### Потік (візуально)
```
[Choose Language] -> [Select Mode + Extras] -> [Run Diagnostics] -> [Results + Suggestions] -> [Export]
```

### Що перевіряє інструмент
- OS, CPU, RAM, GPU, швидкість/затримка інтернету
- Опційно: встановлені IDE, інструменти та мови
- Опційно: деталі мережі та план живлення (режим extensive)

### Логіка порад
- Режим Brief: фокус на готовності до роботи.
- Режим Extensive: фокус на продуктивності та ефективності.

### Export
- Експорти TXT, PDF, JSON і CSV містять результати + поради.
- Імена файлів мають часову мітку.

### Підсумок і baseline
- Кожен запуск містить health score та top priorities.
- Збережіть baseline і порівнюйте з наступними запусками.

### Приватність і мережа
- Діагностика локальна.
- Експорти зберігаються локально (за замовчуванням: папка Downloads) і нікуди не надсилаються.
- Мережеві шляхи заблоковані для exports/baselines, щоб дані залишалися локально.
- Немає telemetry чи відправлення діагностики; лише опційний тест швидкості надсилає синтетичний трафік на endpoint-и.
- Автовизначення мови використовує регіон IP; нічого не зберігається.

### Поради щодо оптимізації завантаження
- Надайте зрозумілий changelog та скріншоти.
- Тримайте installers невеликими та підписаними.
- Додайте короткий "first run" гайд у README.
- За можливості пропонуйте portable і installer варіанти.
- Публікуйте hashes для перевірки цілісності.

---
## Français

### Démarrage rapide (étape par étape)
1. Choisissez la langue au premier écran.
2. **Bref** pour démarrer vite, **Approfondi** pour le maximum.
3. (Optionnel) Activez **Logiciels/IDE** et **Outils & langages**.
4. Cliquez **Lancer le diagnostic**.
5. Consultez **Suggestions d'optimisation** et exportez TXT/PDF.

### Flux (visuel)
```
[Langue] -> [Mode + Extras] -> [Diagnostic] -> [Résultats + Suggestions] -> [Export]
```

### Ce que l'outil vérifie
- OS, CPU, RAM, GPU, internet
- Optionnel: IDE, outils, langages
- Optionnel: réseau et plan d'alimentation (approfondi)

### Logique des suggestions
- Bref: prêt à travailler.
- Approfondi: performance et efficacité max.

### Export
- TXT, PDF, JSON et CSV incluent résultats + suggestions.

### Confidentialité
- Diagnostics locaux.
- Les exports sont enregistrés localement (par défaut: votre dossier Téléchargements) et ne sont envoyés nulle part.
- Les chemins réseau sont bloqués pour les exports/baselines afin de garder les données en local.
- Pas de télémétrie ni d'upload des diagnostics; seul le test de vitesse optionnel envoie du trafic synthétique vers des endpoints de test.
- Détection de langue via IP; rien n'est stocké.

### Conseils de téléchargement
- Changelog clair et captures.
- Installers compacts et signés.
- Mini guide "premier lancement".
- Portable + installer si possible.
- Publier des hashes.

---

## Português

### Início rápido (passo a passo)
1. Escolha o idioma no primeiro ecrã.
2. **Breve** para rapidez, **Extenso** para máximo desempenho.
3. (Opcional) Ative **Software/IDEs** e **Ferramentas e linguagens**.
4. Clique **Executar diagnóstico**.
5. Veja **Sugestões de otimização** e exporte TXT/PDF.

### Fluxo (visual)
```
[Idioma] -> [Modo + Extras] -> [Diagnóstico] -> [Resultados + Sugestões] -> [Exportação]
```

### O que a ferramenta verifica
- OS, CPU, RAM, GPU, internet
- Opcional: IDEs, ferramentas, linguagens
- Opcional: rede e plano de energia (extenso)

### Lógica das sugestões
- Breve: pronto a trabalhar.
- Extenso: performance máxima.

### Exportar
- TXT, PDF, JSON e CSV incluem resultados + sugestões.

### Privacidade
- Diagnóstico local.
- As exportações são guardadas localmente (por defeito: pasta Transferências) e não são enviadas para lado nenhum.
- Caminhos de rede estão bloqueados para exportações/baselines para manter os dados locais.
- Sem telemetria ou upload dos diagnósticos; apenas o teste de velocidade opcional envia tráfego sintético para endpoints de teste.
- Deteção de idioma via IP; nada é guardado.

### Dicas de download
- Changelog claro e screenshots.
- Instaladores pequenos e assinados.
- Guia curto "primeira execução".
- Opções portable + installer.
- Publicar hashes.

---

## Español

### Inicio rápido (paso a paso)
1. Elige el idioma en la primera pantalla.
2. **Breve** para empezar rápido, **Extenso** para máximo rendimiento.
3. (Opcional) Activa **Software/IDEs** y **Herramientas e idiomas**.
4. Haz clic en **Ejecutar diagnóstico**.
5. Revisa **Sugerencias de optimización** y exporta TXT/PDF.

### Flujo (visual)
```
[Idioma] -> [Modo + Extras] -> [Diagnóstico] -> [Resultados + Sugerencias] -> [Exportar]
```

### Qué comprueba la herramienta
- OS, CPU, RAM, GPU, internet
- Opcional: IDEs, herramientas, idiomas
- Opcional: red y plan de energía (extenso)

### Lógica de sugerencias
- Breve: listo para trabajar.
- Extenso: máximo rendimiento.

### Exportar
- TXT, PDF, JSON y CSV incluyen resultados + sugerencias.

### Privacidad
- Diagnósticos locales.
- Las exportaciones se guardan localmente (por defecto: tu carpeta Descargas) y no se envían a ningún sitio.
- Las rutas de red están bloqueadas para exportaciones/baselines para mantener los datos locales.
- Sin telemetría ni subida de diagnósticos; solo la prueba de velocidad opcional envía tráfico sintético a endpoints de prueba.
- Detección de idioma vía IP; no se guarda nada.

### Consejos de descarga
- Changelog claro y capturas.
- Instaladores pequeños y firmados.
- Guía breve de "primer uso".
- Opciones portable + installer.
- Publicar hashes.

---

## Italiano

### Avvio rapido (passo per passo)
1. Scegli la lingua nella prima schermata.
2. **Breve** per partire subito, **Estesa** per massimo rendimento.
3. (Opzionale) Attiva **Software/IDE** e **Strumenti e linguaggi**.
4. Clicca **Esegui diagnostica**.
5. Consulta **Suggerimenti di ottimizzazione** ed esporta TXT/PDF.

### Flusso (visivo)
```
[Lingua] -> [Modalità + Extra] -> [Diagnostica] -> [Risultati + Suggerimenti] -> [Export]
```

### Cosa controlla lo strumento
- OS, CPU, RAM, GPU, internet
- Opzionale: IDE, strumenti, linguaggi
- Opzionale: rete e piano energia (esteso)

### Logica suggerimenti
- Breve: pronto a iniziare.
- Estesa: massimo rendimento.

### Export
- TXT, PDF, JSON e CSV includono risultati + suggerimenti.

### Privacy
- Diagnostica locale.
- Le esportazioni vengono salvate localmente (predefinito: cartella Download) e non vengono inviate da nessuna parte.
- I percorsi di rete sono bloccati per esportazioni/baseline per mantenere i dati locali.
- Nessuna telemetria o upload delle diagnosi; solo il test di velocità opzionale invia traffico sintetico agli endpoint di test.
- Rilevamento lingua via IP; nulla viene salvato.

### Consigli download
- Changelog chiaro e screenshot.
- Installer piccoli e firmati.
- Guida breve "primo avvio".
- Opzioni portable + installer.
- Pubblica hash.

---

## Bahasa Indonesia

### Mulai cepat (langkah demi langkah)
1. Pilih bahasa di layar pertama.
2. **Singkat** untuk mulai cepat, **Lengkap** untuk performa maksimum.
3. (Opsional) Aktifkan **Software/IDE** dan **Alat & bahasa**.
4. Klik **Jalankan diagnostik**.
5. Lihat **Saran optimasi** dan ekspor TXT/PDF.

### Alur (visual)
```
[Bahasa] -> [Mode + Ekstra] -> [Diagnostik] -> [Hasil + Saran] -> [Ekspor]
```

### Apa yang diperiksa
- OS, CPU, RAM, GPU, internet
- Opsional: IDE, alat, bahasa
- Opsional: jaringan dan power plan (lengkap)

### Logika saran
- Singkat: siap mulai kerja.
- Lengkap: performa maksimum.

### Ekspor
- TXT, PDF, JSON, dan CSV berisi hasil + saran.

### Privasi
- Diagnostik lokal.
- Ekspor disimpan secara lokal (default: folder Unduhan) dan tidak dikirim ke mana pun.
- Jalur jaringan diblokir untuk ekspor/baseline agar data tetap lokal.
- Tanpa telemetri atau unggah diagnostik; hanya uji kecepatan opsional yang mengirim trafik sintetis ke endpoint uji.
- Deteksi bahasa via IP; tidak disimpan.

### Tips unduhan
- Changelog jelas dan screenshot.
- Installer kecil dan ditandatangani.
- Panduan "first run" singkat.
- Opsi portable + installer.
- Publikasikan hash.
