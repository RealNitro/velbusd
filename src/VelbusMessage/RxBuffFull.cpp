#include "RxBuffFull.hpp"
#include "Registrar.hpp"
#include "../utils/output.hpp"
#include <sstream>

namespace VelbusMessage {

class RxBuffFullRegisterer {
public:
	RxBuffFullRegisterer() {
		struct registrar_key k;
		k.rtr      = 0;
		k.priority = 0;
		k.length   = 1;
		k.command  = 0x0B;
		struct factory_methods f;
		f.factory = &RxBuffFull::factory;
		Registrar::get_instance().add(k, f);
	}
};

extern "C" { /* To make this auto-load when dlopen()ed */
	RxBuffFullRegisterer RxBuffFull; /* Create a static instance: register with the registrar */
}

RxBuffFull::RxBuffFull( unsigned char prio, unsigned char addr, unsigned char rtr, std::string const &data ) 
		throw( FormError ) :
		VelbusMessage(prio, addr, rtr) {
	if( prio != 0 ) throw FormError("Wrong prio");
	if( rtr != 0 ) throw FormError("Wrong RTR");
	if( data.length() != 1 ) throw FormError("Incorrect length");
	if( data[0] != (char)0x0B ) throw FormError("Wrong type");

	if( addr != 0x00 ) throw FormError("VMB1RS command not from address 0x00");
}

std::string RxBuffFull::data() throw() {
	std::string ret("\x0B", 1);
	return ret;
}

std::string RxBuffFull::string() throw() {
	std::ostringstream o;
	o << "RxBuffFull from 0x" << hex(m_addr);
	return o.str();
}

} // namespace
