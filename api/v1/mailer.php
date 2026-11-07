<?php
/**
 * Universal Mailer & SMTP Client - API v1
 * Path: /api/v1/mailer.php
 */

date_default_timezone_set('Africa/Nairobi');

class AppMailer {
    private static $debug_log = [];

    private static function log($message) {
        self::$debug_log[] = "[" . date('Y-m-d H:i:s') . "] " . $message;
        error_log("[UQLEARN Mailer] " . $message);
    }

    public static function getDebugLog() {
        return self::$debug_log;
    }

    public static function getSmtpSettings($conn = null) {
        // FORCED SMTP SETTINGS (Bypasses DB and mail() fallback)
        return [
            'enabled' => true,
            'host' => 'mail.uqlearn.org',
            'port' => 465,
            'crypto' => 'ssl', // ssl for 465, tls for 587
            'auth' => true,
            'user' => 'support@uqlearn.org',
            'pass' => 'Mko@3196', // <--- PUT THE REAL PASSWORD HERE
            'from_email' => 'support@uqlearn.org',
            'from_name' => 'UQLearn Support',
            'reply_to' => 'support@uqlearn.org'
        ];
    }

    public static function send($to, $subject, $html_body, $plain_body = '', $conn = null) {
        self::$debug_log = [];
        self::log("Initiating send to: {$to} | Subject: {$subject}");

        $to = trim(strtolower($to));
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            self::log("Invalid recipient email address: {$to}");
            return ['success' => false, 'message' => "Invalid recipient email address: {$to}", 'logs' => self::$debug_log];
        }

        $smtp = self::getSmtpSettings($conn);
        $fromEmail = $smtp['from_email'];
        $fromName = $smtp['from_name'];
        $replyTo = $smtp['reply_to'];

        self::log("Attempting delivery via SMTP host {$smtp['host']}:{$smtp['port']} (crypto: {$smtp['crypto']})");
        $smtpResult = self::sendViaSmtp($smtp, $to, $subject, $html_body, $plain_body, $fromEmail, $fromName, $replyTo);
        
        if ($smtpResult['success']) {
            self::log("SMTP delivery successful to {$to}");
            self::recordLog($conn, $to, $subject, 'smtp', true, self::$debug_log);
            return ['success' => true, 'method' => 'smtp', 'message' => 'Email delivered via SMTP', 'logs' => self::$debug_log];
        } else {
            self::log("SMTP delivery failed: {$smtpResult['message']}");
            self::recordLog($conn, $to, $subject, 'smtp', false, self::$debug_log);
            return ['success' => false, 'method' => 'smtp', 'message' => $smtpResult['message'], 'logs' => self::$debug_log];
        }
    }

    private static function sendViaSmtp($smtp, $to, $subject, $html_body, $plain_body, $fromEmail, $fromName, $replyTo) {
        $host = $smtp['host'];
        $port = $smtp['port'] ?: 465;
        $crypto = strtolower($smtp['crypto'] ?: 'ssl');
        $timeout = 15;

        $targetHost = ($crypto === 'ssl') ? 'ssl://' . $host : $host;
        self::log("Opening socket connection to {$targetHost}:{$port} (timeout {$timeout}s)...");

        $socket = @stream_socket_client(
            "{$targetHost}:{$port}",
            $errno,
            $errstr,
            $timeout,
            STREAM_CLIENT_CONNECT,
            stream_context_create([
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                ]
            ])
        );

        if (!$socket) {
            self::log("Socket connection error ({$errno}): {$errstr}");
            return ['success' => false, 'message' => "Socket connection failed: {$errstr} ({$errno}). Check host/port."];
        }

        stream_set_timeout($socket, $timeout);

        $readResponse = function() use ($socket) {
            $response = '';
            while ($line = fgets($socket, 512)) {
                $response .= $line;
                if (substr($line, 3, 1) === ' ') break;
            }
            return trim($response);
        };

        $sendCommand = function($cmd, $expectCode) use ($socket, $readResponse) {
            self::log("CLIENT > " . (strpos($cmd, 'AUTH') === 0 || strlen($cmd) > 100 ? substr($cmd, 0, 15) . '***' : $cmd));
            fputs($socket, $cmd . "\r\n");
            $response = $readResponse();
            self::log("SERVER < " . $response);
            $code = substr($response, 0, 3);
            if ($code != $expectCode && !in_array($code, (array)$expectCode)) {
                return ['success' => false, 'response' => $response, 'code' => $code];
            }
            return ['success' => true, 'response' => $response, 'code' => $code];
        };

        $greeting = $readResponse();
        self::log("SERVER < " . $greeting);
        if (substr($greeting, 0, 3) !== '220') {
            fclose($socket);
            return ['success' => false, 'message' => "Invalid SMTP greeting: {$greeting}"];
        }

        $clientDomain = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'uqlearn.org';
        $res = $sendCommand("EHLO " . $clientDomain, 250);
        if (!$res['success']) {
            $res = $sendCommand("HELO " . $clientDomain, 250);
            if (!$res['success']) {
                fclose($socket);
                return ['success' => false, 'message' => "EHLO/HELO failed: {$res['response']}"];
            }
        }

        if ($crypto === 'tls') {
            $res = $sendCommand("STARTTLS", 220);
            if (!$res['success']) {
                fclose($socket);
                return ['success' => false, 'message' => "STARTTLS failed: {$res['response']}"];
            }
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                fclose($socket);
                return ['success' => false, 'message' => "TLS handshake failed"];
            }
            $sendCommand("EHLO " . $clientDomain, 250);
        }

        if (!empty($smtp['auth']) && !empty($smtp['user'])) {
            $res = $sendCommand("AUTH LOGIN", 334);
            if (!$res['success']) {
                fclose($socket);
                return ['success' => false, 'message' => "AUTH LOGIN rejected: {$res['response']}"];
            }

            $res = $sendCommand(base64_encode($smtp['user']), 334);
            if (!$res['success']) {
                fclose($socket);
                return ['success' => false, 'message' => "Username rejected: {$res['response']}"];
            }

            $res = $sendCommand(base64_encode($smtp['pass']), 235);
            if (!$res['success']) {
                fclose($socket);
                return ['success' => false, 'message' => "Authentication failed (invalid password): {$res['response']}"];
            }
            self::log("SMTP Authentication successful for user: {$smtp['user']}");
        }

        $res = $sendCommand("MAIL FROM:<{$fromEmail}>", 250);
        if (!$res['success']) {
            fclose($socket);
            return ['success' => false, 'message' => "MAIL FROM rejected: {$res['response']}"];
        }

        $res = $sendCommand("RCPT TO:<{$to}>", [250, 251]);
        if (!$res['success']) {
            fclose($socket);
            return ['success' => false, 'message' => "RCPT TO rejected: {$res['response']}"];
        }

        $res = $sendCommand("DATA", 354);
        if (!$res['success']) {
            fclose($socket);
            return ['success' => false, 'message' => "DATA rejected: {$res['response']}"];
        }

        $boundary = "==_MIME_BOUND_" . md5(uniqid(microtime(), true));
        $msgId = "<" . time() . "." . bin2hex(random_bytes(6)) . "@" . (parse_url($fromEmail, PHP_URL_HOST) ?: 'uqlearn.org') . ">";

        $headers = [];
        $headers[] = "Date: " . date('r');
        $headers[] = "Message-ID: " . $msgId;
        $headers[] = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromEmail}>";
        $headers[] = "Reply-To: <{$replyTo}>";
        $headers[] = "To: <{$to}>";
        $headers[] = "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=";
        $headers[] = "MIME-Version: 1.0";
        $headers[] = "X-Mailer: UQLEARN-Mailer/1.0";
        $headers[] = "Content-Type: multipart/alternative; boundary=\"{$boundary}\"";

        $content = implode("\r\n", $headers) . "\r\n\r\n";

        if (!empty($plain_body)) {
            $content .= "--{$boundary}\r\n";
            $content .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $content .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
            $content .= $plain_body . "\r\n\r\n";
        }

        $content .= "--{$boundary}\r\n";
        $content .= "Content-Type: text/html; charset=UTF-8\r\n";
        $content .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $content .= $html_body . "\r\n\r\n";
        $content .= "--{$boundary}--\r\n";

        $content = str_replace("\r\n.", "\r\n..", $content);

        fputs($socket, $content . "\r\n.\r\n");
        $finalRes = $readResponse();
        self::log("SERVER < " . $finalRes);

        $sendCommand("QUIT", 221);
        fclose($socket);

        if (substr($finalRes, 0, 3) === '250') {
            return ['success' => true, 'message' => "Message accepted: {$finalRes}"];
        }

        return ['success' => false, 'message' => "Message rejected: {$finalRes}"];
    }

    private static function recordLog($conn, $to, $subject, $method, $success, $logs) {
        if (!($conn instanceof mysqli)) return;
        try {
            $logJson = json_encode([
                'timestamp' => date('Y-m-d H:i:s'),
                'recipient' => $to,
                'subject' => $subject,
                'method' => $method,
                'success' => $success,
                'logs' => $logs
            ]);
            $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('last_email_log', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            if ($stmt) {
                $stmt->bind_param("s", $logJson);
                $stmt->execute();
                $stmt->close();
            }
        } catch (\Throwable $e) {
            // Ignore DB log error
        }
    }
}
?>