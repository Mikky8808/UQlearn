<?php
require_once __DIR__ . '/cors.php';
/**
 * Universal Mailer & SMTP Client - API v1
 * Path: /api/v1/mailer.php
 * 
 * Supports:
 * 1. Authenticated Direct SMTP (SSL/TLS, Gmail, cPanel Webmail, SendGrid, Brevo, AWS SES)
 * 2. RFC-Compliant PHP mail() with envelope sender (-f) fallback
 * 3. Settings persistence in MySQL
 * 4. Step-by-step diagnostic logging for real-time delivery troubleshooting
 */

date_default_timezone_set('Africa/Nairobi');

class AppMailer {
    private static $debug_log = [];

    private static function log($message) {
        self::$debug_log[] = "[" . date('Y-m-d H:i:s') . "] " . $message;
        error_log("[AQLEARN Mailer] " . $message);
    }

    public static function getDebugLog() {
        return self::$debug_log;
    }

    public static function getSmtpSettings($conn = null) {
        $settings = [
            'enabled' => false,
            'host' => '',
            'port' => 465,
            'crypto' => 'ssl', // 'ssl', 'tls', or 'none'
            'auth' => true,
            'user' => '',
            'pass' => '',
            'from_email' => 'noreply@uqlearn.org',
            'from_name' => 'AQLEARN',
            'reply_to' => 'support@uqlearn.org'
        ];

        if ($conn instanceof mysqli) {
            try {
                $res = $conn->query("SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'smtp_%' OR setting_key IN ('mail_from_email', 'mail_from_name', 'mail_reply_to')");
                if ($res) {
                    while ($row = $res->fetch_assoc()) {
                        $key = $row['setting_key'];
                        $val = $row['setting_value'];
                        if ($key === 'smtp_enabled') $settings['enabled'] = ($val === '1' || $val === 'true' || $val === 'yes');
                        if ($key === 'smtp_host') $settings['host'] = trim($val);
                        if ($key === 'smtp_port') $settings['port'] = (int)$val;
                        if ($key === 'smtp_crypto') $settings['crypto'] = strtolower(trim($val));
                        if ($key === 'smtp_auth') $settings['auth'] = ($val !== '0' && $val !== 'false');
                        if ($key === 'smtp_user') $settings['user'] = trim($val);
                        if ($key === 'smtp_pass') $settings['pass'] = trim($val);
                        if ($key === 'smtp_from_email' || $key === 'mail_from_email') $settings['from_email'] = trim($val);
                        if ($key === 'smtp_from_name' || $key === 'mail_from_name') $settings['from_name'] = trim($val);
                        if ($key === 'smtp_reply_to' || $key === 'mail_reply_to') $settings['reply_to'] = trim($val);
                    }
                }
            } catch (\Throwable $e) {
                self::log("Error fetching SMTP settings from DB: " . $e->getMessage());
            }
        }

        return $settings;
    }

    /**
     * Send email via Socket SMTP or PHP mail()
     * 
     * @param string $to Recipient email
     * @param string $subject Email subject
     * @param string $html_body HTML formatted body
     * @param string $plain_body Optional plain text version
     * @param mysqli|null $conn Database connection
     * @return array ['success' => bool, 'method' => string, 'message' => string, 'logs' => array]
     */
    public static function send($to, $subject, $html_body, $plain_body = '', $conn = null) {
        self::$debug_log = [];
        self::log("Initiating send to: {$to} | Subject: {$subject}");

        $to = trim(strtolower($to));
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            self::log("Invalid recipient email address: {$to}");
            return [
                'success' => false,
                'method' => 'none',
                'message' => "Invalid recipient email address: {$to}",
                'logs' => self::$debug_log
            ];
        }

        $smtp = self::getSmtpSettings($conn);
        $fromEmail = !empty($smtp['from_email']) ? $smtp['from_email'] : 'noreply@uqlearn.org';
        $fromName = !empty($smtp['from_name']) ? $smtp['from_name'] : 'AQLEARN';
        $replyTo = !empty($smtp['reply_to']) ? $smtp['reply_to'] : 'support@uqlearn.org';

        // 1. Try Authenticated SMTP if configured
        if (!empty($smtp['enabled']) && !empty($smtp['host'])) {
            self::log("Attempting delivery via SMTP host {$smtp['host']}:{$smtp['port']} (crypto: {$smtp['crypto']})");
            $smtpResult = self::sendViaSmtp($smtp, $to, $subject, $html_body, $plain_body, $fromEmail, $fromName, $replyTo);
            
            if ($smtpResult['success']) {
                self::log("SMTP delivery successful to {$to}");
                self::recordLog($conn, $to, $subject, 'smtp', true, self::$debug_log);
                return [
                    'success' => true,
                    'method' => 'smtp',
                    'message' => 'Email delivered via SMTP',
                    'logs' => self::$debug_log
                ];
            } else {
                self::log("SMTP delivery failed: {$smtpResult['message']}. Falling back to PHP mail()...");
            }
        } else {
            self::log("SMTP not enabled or host not configured. Using enhanced PHP mail().");
        }

        // 2. Fallback to enhanced PHP mail() with RFC headers and -f envelope
        $mailResult = self::sendViaNativeMail($to, $subject, $html_body, $plain_body, $fromEmail, $fromName, $replyTo);
        self::recordLog($conn, $to, $subject, 'mail', $mailResult['success'], self::$debug_log);

        return [
            'success' => $mailResult['success'],
            'method' => 'mail',
            'message' => $mailResult['message'],
            'logs' => self::$debug_log
        ];
    }

    /**
     * Pure PHP Socket SMTP Client (No external libraries required)
     */
    private static function sendViaSmtp($smtp, $to, $subject, $html_body, $plain_body, $fromEmail, $fromName, $replyTo) {
        $host = $smtp['host'];
        $port = $smtp['port'] ?: 465;
        $crypto = strtolower($smtp['crypto'] ?: 'ssl');
        $timeout = 12;

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
            return ['success' => false, 'message' => "Socket error: {$errstr} ({$errno})"];
        }

        stream_set_timeout($socket, $timeout);

        $readResponse = function() use ($socket) {
            $response = '';
            while ($line = fgets($socket, 512)) {
                $response .= $line;
                if (substr($line, 3, 1) === ' ') {
                    break;
                }
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

        // 1. Read greeting
        $greeting = $readResponse();
        self::log("SERVER < " . $greeting);
        if (substr($greeting, 0, 3) !== '220') {
            fclose($socket);
            return ['success' => false, 'message' => "Invalid SMTP greeting: {$greeting}"];
        }

        // 2. Send EHLO
        $clientDomain = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'uqlearn.org';
        $res = $sendCommand("EHLO " . $clientDomain, 250);
        if (!$res['success']) {
            $res = $sendCommand("HELO " . $clientDomain, 250);
            if (!$res['success']) {
                fclose($socket);
                return ['success' => false, 'message' => "EHLO/HELO failed: {$res['response']}"];
            }
        }

        // 3. Handle STARTTLS if configured
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

        // 4. Authenticate
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
                return ['success' => false, 'message' => "Authentication failed (invalid password or app password): {$res['response']}"];
            }
            self::log("SMTP Authentication successful for user: {$smtp['user']}");
        }

        // 5. MAIL FROM
        $res = $sendCommand("MAIL FROM:<{$fromEmail}>", 250);
        if (!$res['success']) {
            fclose($socket);
            return ['success' => false, 'message' => "MAIL FROM rejected: {$res['response']}"];
        }

        // 6. RCPT TO
        $res = $sendCommand("RCPT TO:<{$to}>", [250, 251]);
        if (!$res['success']) {
            fclose($socket);
            return ['success' => false, 'message' => "RCPT TO rejected: {$res['response']}"];
        }

        // 7. DATA
        $res = $sendCommand("DATA", 354);
        if (!$res['success']) {
            fclose($socket);
            return ['success' => false, 'message' => "DATA rejected: {$res['response']}"];
        }

        // 8. Build RFC 2822 Message
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
        $headers[] = "X-Mailer: AQLEARN-Mailer/1.0";
        $headers[] = "Content-Type: multipart/alternative; boundary=\"{$boundary}\"";

        $content = implode("\r\n", $headers) . "\r\n\r\n";

        // Plain text part
        if (!empty($plain_body)) {
            $content .= "--{$boundary}\r\n";
            $content .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $content .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
            $content .= $plain_body . "\r\n\r\n";
        }

        // HTML part
        $content .= "--{$boundary}\r\n";
        $content .= "Content-Type: text/html; charset=UTF-8\r\n";
        $content .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $content .= $html_body . "\r\n\r\n";

        $content .= "--{$boundary}--\r\n";

        // Avoid dot escaping issue in SMTP
        $content = str_replace("\r\n.", "\r\n..", $content);

        // Send content followed by dot
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

    /**
     * Enhanced Native PHP mail() with strict RFC headers & envelope sender -f
     */
    private static function sendViaNativeMail($to, $subject, $html_body, $plain_body, $fromEmail, $fromName, $replyTo) {
        if (!function_exists('mail')) {
            self::log("PHP mail() function is disabled or unavailable on this server.");
            return ['success' => false, 'message' => 'PHP mail() function is disabled on this server.'];
        }

        $boundary = "==_MIME_BOUND_" . md5(uniqid(microtime(), true));
        $msgId = "<" . time() . "." . bin2hex(random_bytes(6)) . "@" . (parse_url($fromEmail, PHP_URL_HOST) ?: 'uqlearn.org') . ">";

        $headers = [];
        $headers[] = "Date: " . date('r');
        $headers[] = "Message-ID: " . $msgId;
        $headers[] = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromEmail}>";
        $headers[] = "Reply-To: {$replyTo}";
        $headers[] = "Return-Path: <{$fromEmail}>";
        $headers[] = "X-Mailer: PHP/" . phpversion();
        $headers[] = "MIME-Version: 1.0";
        $headers[] = "Content-Type: multipart/alternative; boundary=\"{$boundary}\"";
        $headersStr = implode("\r\n", $headers);

        $body = "--{$boundary}\r\n";
        if (!empty($plain_body)) {
            $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
            $body .= $plain_body . "\r\n\r\n";
            $body .= "--{$boundary}\r\n";
        }
        $body .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $body .= $html_body . "\r\n\r\n";
        $body .= "--{$boundary}--";

        $encodedSubject = "=?UTF-8?B?" . base64_encode($subject) . "?=";
        $additionalParams = "-f" . escapeshellarg($fromEmail);

        try {
            self::log("Calling mail() with envelope parameter: {$additionalParams}");
            $sent = @mail($to, $encodedSubject, $body, $headersStr, $additionalParams);
            
            if (!$sent) {
                // Try without -f in case the host's safe mode / configuration restricts custom flags
                self::log("mail() with -f failed. Retrying without additional parameters...");
                $sent = @mail($to, $encodedSubject, $body, $headersStr);
            }

            if ($sent) {
                self::log("Native mail() returned TRUE (Accepted by local MTA / sendmail)");
                return ['success' => true, 'message' => 'Email sent via native mail() function'];
            } else {
                $lastErr = error_get_last();
                $errMsg = isset($lastErr['message']) ? $lastErr['message'] : 'Local MTA failed to accept message';
                self::log("Native mail() returned FALSE: {$errMsg}");
                return ['success' => false, 'message' => $errMsg];
            }
        } catch (\Throwable $e) {
            self::log("mail() exception: " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
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
