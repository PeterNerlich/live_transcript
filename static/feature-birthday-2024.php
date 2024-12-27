<?php
	$settings = parse_ini_file("/home/".get_current_user()."/.my.cnf", true, INI_SCANNER_RAW);
	$user = $settings['client']['user'];
	$pass = $settings['client']['password'];
	$db = "{$user}_translatelive_statistics";
	$charset = "utf8mb4";

	$options = [
		PDO::ATTR_ERRMODE               => PDO::ERRMODE_EXCEPTION,
		PDO::ATTR_DEFAULT_FETCH_MODE    => PDO::FETCH_ASSOC,
		PDO::ATTR_EMULATE_PREPARES      => false,
	];

	try {
		$pdo = new PDO("mysql:host=localhost;dbname={$db};charset={$charset}", $user, $pass, $options);

		$pdo->exec("CREATE TABLE IF NOT EXISTS `feature-birthday-2024-survey-raw` (
			`id` INTEGER PRIMARY KEY AUTO_INCREMENT NOT NULL,
			`ts` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
			`server_name` VARCHAR(64),
			`json` MEDIUMTEXT NOT NULL
		)");
	} catch (PDOException $e) {
		http_response_code(500);
		//throw new PDOException($e->getMessage(), (int)$e->getCode());
		die($e->getCode()."    ".$e->getMessage());
	}

	/****************************************/

	$json = file_get_contents('php://input');

	try {
		$stmt = $pdo->prepare("INSERT INTO `feature-birthday-2024-survey-raw` (server_name, json) VALUES(?, ?)");
		$stmt->execute([
			$_SERVER['SERVER_NAME'],
			$json
		]);
	} catch (PDOException $e) {
		http_response_code(500);
		throw new PDOException($e->getMessage(), (int)$e->getCode());
		die("Something went wrong...");
	}

	http_response_code(204);

	$data = json_decode($json);

	try {
		$pdo->exec("CREATE TABLE IF NOT EXISTS `feature-birthday-2024-survey` (
			`id` INTEGER PRIMARY KEY AUTO_INCREMENT NOT NULL,
			`ts` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
			`server_name` VARCHAR(64),
			`surveyLanguage` VARCHAR(8),
			`uuid` VARCHAR(36),
			`nextQuestion` VARCHAR(32),
			`qGerman` VARCHAR(8),
			`qUnderstandable` VARCHAR(8),
			`qSenseOfBelonging` VARCHAR(8),
			`qNonsense` VARCHAR(8),
			`qReliability` VARCHAR(8),
			`qLatency` VARCHAR(8),
			`qInitialTranslationBad` VARCHAR(8),
			`qCorrectionsConfusing` VARCHAR(8),
			`qDiffConfusing` VARCHAR(8),
			`qDiffHelpful` VARCHAR(8),
			`qDiffUnexplained` VARCHAR(8),
			`qDiffRedDisruptive` VARCHAR(8),
			`qLineGap` VARCHAR(8),
			`qOwnDataPlan` VARCHAR(8),
			`qWifiHelpful` VARCHAR(8),
			`qBugsSpotted` VARCHAR(8),
			`qScrollSluggish` VARCHAR(8),
			`qBatteryDrain` VARCHAR(8),
			`qLyricsHelpful` VARCHAR(8),
			`qAnnouncementsHelpful` VARCHAR(8),
			`qUsedAsCalendar` VARCHAR(8),
			`qReadingAgain` VARCHAR(8),
			`qReadingInAbsence` VARCHAR(8),
			`qMisc` VARCHAR(2048),
			`qTechnical` BOOLEAN,
			`languages` VARCHAR(512),
			`screen` VARCHAR(128),
			`userAgent` VARCHAR(265)
		)");
	} catch (PDOException $e) {
		http_response_code(500);
		//throw new PDOException($e->getMessage(), (int)$e->getCode());
		die($e->getCode()."    ".$e->getMessage());
	}

	try {
		$stmt = $pdo->prepare("INSERT INTO `feature-birthday-2024-survey` (server_name, surveyLanguage, uuid, nextQuestion, qGerman, qUnderstandable, qSenseOfBelonging, qNonsense, qReliability, qLatency, qInitialTranslationBad, qCorrectionsConfusing, qDiffConfusing, qDiffHelpful, qDiffUnexplained, qDiffRedDisruptive, qLineGap, qOwnDataPlan, qWifiHelpful, qBugsSpotted, qScrollSluggish, qBatteryDrain, qLyricsHelpful, qAnnouncementsHelpful, qUsedAsCalendar, qReadingAgain, qReadingInAbsence, qMisc, qTechnical, languages, screen, userAgent) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
		$stmt->execute([
			$_SERVER['SERVER_NAME'],
			$data->surveyLanguage,
			$data->id,
			$data->nextQuestion,
			$data->qGerman,
			$data->qUnderstandable,
			$data->qSenseOfBelonging,
			$data->qNonsense,
			$data->qReliability,
			$data->qLatency,
			$data->qInitialTranslationBad,
			$data->qCorrectionsConfusing,
			$data->qDiffConfusing,
			$data->qDiffHelpful,
			$data->qDiffUnexplained,
			$data->qDiffRedDisruptive,
			$data->qLineGap,
			$data->qOwnDataPlan,
			$data->qWifiHelpful,
			$data->qBugsSpotted,
			$data->qScrollSluggish,
			$data->qBatteryDrain,
			$data->qLyricsHelpful,
			$data->qAnnouncementsHelpful,
			$data->qUsedAsCalendar,
			$data->qReadingAgain,
			$data->qReadingInAbsence,
			$data->qMisc,
			$data->qTechnical,
			$data->languages,
			$data->screen,
			$data->userAgent
		]);
	} catch (PDOException $e) {
		http_response_code(500);
		throw new PDOException($e->getMessage(), (int)$e->getCode());
		die("Something went wrong...");
	}	

	/*} else {
		http_response_code(400);
		die("No valuable data sent.");
	}*/
?>
