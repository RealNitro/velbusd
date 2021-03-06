#include <config.h>

#include <iostream>
#include <stdio.h>
#include <string>
#ifdef HAVE_PTY_H
 #include <pty.h>
#elif defined HAVE_UTIL_H
 #include <util.h>
#endif
#include <unistd.h>
#include <fcntl.h>
#include "../src/utils/output.hpp"

int write(int to, std::string const &what) {
	int rv = write(to, what.data(), what.length());
	if( rv == -1 ) {
		perror("write()");
		return 1;
	}
	if( rv != what.length() ) {
		std::cerr << "Write count does not match\n";
		return 1;
	}
	return 0;
}

int main(int argc, char *argv[]) {
	int s_master, s_slave;
	char n_slave[255];
	int rv = openpty(&s_master, &s_slave, n_slave, NULL, NULL);
	if( rv == -1 ) {
		perror("openpty()");
		return 1;
	}

	// Setting up port
	struct termios port_options;
	tcgetattr(s_master, &port_options);

	port_options.c_cflag |= CLOCAL; // Don't change owner of port
	port_options.c_cflag |= CREAD; // Enable receiver

	port_options.c_cflag &= ~CSIZE; // Mask the character size bits
	port_options.c_cflag |= CS8;    // Select 8 data bits

	port_options.c_cflag &= ~CRTSCTS; // Disable hardware flow control

	port_options.c_lflag &= ~(ICANON | ECHO | ECHOE | ISIG | IEXTEN); // Raw mode

	port_options.c_iflag |= IGNPAR; // Ignore parity (since none is used)
	port_options.c_iflag &= ~(IXON | IXOFF | IXANY); // Disable software flow control
	port_options.c_iflag &= ~(ISTRIP | IGNBRK | BRKINT | PARMRK );
	port_options.c_iflag &= ~INLCR; // Turn off any conversions
	port_options.c_iflag &= ~ICRNL;
	port_options.c_iflag &= ~IGNCR;

	port_options.c_oflag &= ~OPOST; // Disable output processing = raw mode

	// Apply port_options
	tcsetattr(s_master, TCSANOW, &port_options);
	tcsetattr(s_slave, TCSANOW, &port_options);

	std::cout << n_slave << "\n" << std::flush;

	char rxbuf[4096];
	std::string buf;
	while(1) {
		int n = read(s_master, rxbuf, sizeof(rxbuf));
		if( n == -1 ) {
			perror("read()");
			return 1;
		}
		if( n == 0 ) {
			break;
		}

		buf.append(rxbuf, n);

		while( buf[0] != 0x0f && buf.length() > 0 ) {
			std::cerr << "Discarding byte\n";
			buf = buf.substr(1);
		}
		if( buf.length() < 6 ) {
			// Insufficient data
			continue;
		}
		unsigned short data_length = buf[3]&0x0f;
		if( buf.length() < 6 + data_length ) {
			// Insufficient data
			continue;
		}
		std::string msg = buf.substr(0, 6+data_length);
		buf = buf.substr(6+data_length);

		if( msg.compare(0,7,"\x0f\xf8\x00\x01\x0e\xea\x04",7) == 0 ) {
			// Interface Status request
			// Reply with Bus Active & Receive Ready
			msg.assign("\x0f\xf8\x00\x01\x0a\xee\x04\x0f\xf8\x00\x01\x0c\xec\x04", 7+7);
			if( write(s_master, msg) ) return 1;

		} else if( msg.compare(0,6,"\x0f\xfb\xff\x40\xb7\x04",6) == 0 ) {
			// Module type request for module 0xff
			// Pretend buffer is full for 1 second
			msg.assign("\x0f\xf8\x00\x01\x0b\xed\x04", 7);
			if( write(s_master, msg) ) return 1;
			sleep(1);

			// Now discard whatever we read and is available for read (after all, the buffer is full)
			buf.clear();
			fcntl(s_master, F_SETFL, fcntl(s_master, F_GETFL) | O_NONBLOCK );
			read(s_master, rxbuf, sizeof(rxbuf));
			fcntl(s_master, F_SETFL, fcntl(s_master, F_GETFL) & ~O_NONBLOCK );

			// Ok, we're ready for Rx again
			msg.assign("\x0f\xf8\x00\x01\x0c\xec\x04", 7);
			if( write(s_master, msg) ) return 1;

		} else {
			// else echo back message
			//msg = msg;
			if( write(s_master, msg) ) return 1;
		}

	}

	return 0;
}
