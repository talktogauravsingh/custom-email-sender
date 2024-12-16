const net = require('net');
const tls = require('tls');

function sendMail({ host, port, secure, user, pass, from, fromName, to, subject, message }) {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect(port, host, { rejectUnauthorized: false })
      : net.createConnection(port, host);

    socket.on('connect', () => {
      console.log('Connected to SMTP server');
    });

    let responseBuffer = '';
    const writeCommand = (command) => {
      console.log(`>> ${command}`);
      socket.write(command + '\r\n');
    };

    socket.on('data', (data) => {
      responseBuffer += data.toString();
      const responses = responseBuffer.split('\r\n');
      responseBuffer = responses.pop(); // Keep incomplete command

      responses.forEach((response) => {
        console.log(`<< ${response}`);
        handleResponse(response);
      });
    });

    let step = 0;
    const handleResponse = (response) => {
      if (step === 0 && response.startsWith('220')) {
        writeCommand(`EHLO localhost`);
        step++;
      } else if (step === 1 && response.startsWith('250')) {
        if (user && pass) {
          writeCommand(`AUTH LOGIN`);
          step++;
        } else {
          writeCommand(`MAIL FROM:<${from}>`);
          step += 2; // Skip authentication
        }
      } else if (step === 2 && response.startsWith('334')) {
        writeCommand(Buffer.from(user).toString('base64')); // Send username
        step++;
      } else if (step === 3 && response.startsWith('334')) {
        writeCommand(Buffer.from(pass).toString('base64')); // Send password
        step++;
      } else if (step === 4 && response.startsWith('235')) {
        writeCommand(`MAIL FROM:<${from}>`);
        step++;
      } else if (step === 5 && response.startsWith('250')) {
        writeCommand(`RCPT TO:<${to}>`);
        step++;
      } else if (step === 6 && response.startsWith('250')) {
        writeCommand(`DATA`);
        step++;
      } else if (step === 7 && response.startsWith('354')) {
        writeCommand(
          `From: "${fromName}" <${from}>\r\n` +
          `To: ${to}\r\n` +
          `Subject: ${subject}\r\n\r\n` +
          `${message}\r\n.`
        );
        step++;
      } else if (step === 8 && response.startsWith('250')) {
        writeCommand(`QUIT`);
        step++;
      } else if (step === 9 && response.startsWith('221')) {
        socket.end();
        resolve('Email sent successfully');
      } else if (response.startsWith('5') || response.startsWith('4')) {
        socket.end();
        reject(new Error(`SMTP Error: ${response}`));
      }
    };

    socket.on('error', (err) => {
      reject(err);
    });

    socket.on('end', () => {
      console.log('Connection closed');
    });
  });
}


sendMail({
  host: '', 
  port: 465,
  secure: true, 
  user: 'SMTP_USERNAME', 
  pass: 'SMTP_PASSWORD', 
  from: 'FROM_EMAIL',
  fromName: 'FROM_NAME',
  to: 'TO_EMAIL',
  subject: 'SUBJECT',
  message: 'MESSAGE',
})
  .then(console.log)
  .catch(console.error);
