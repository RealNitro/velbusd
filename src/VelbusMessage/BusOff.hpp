#ifndef __VELBUSMESSAGE_BusOff_HPP__
#define __VELBUSMESSAGE_BusOff_HPP__

#include "VelbusMessage.hpp"

namespace VelbusMessage {

class BusOff : public VelbusMessage {
public:

protected:
	BusOff( unsigned char prio, unsigned char addr, unsigned char rtr, std::string const &data)
		throw(FormError);

public:
	static VelbusMessage* factory(unsigned char prio, unsigned char addr, unsigned char rtr, std::string const &data) {
		return new BusOff(prio, addr, rtr, data);
	}

	virtual std::string data() throw();
	virtual std::string string() throw();
};

} // Namespace

#endif // __VELBUSMESSAGE_BusOff_HPP__
