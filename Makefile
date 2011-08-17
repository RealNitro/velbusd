all: velbusd

clean:
	rm -f velbusd
	rm -f *.o *.d
	rm -f config.log config.status
	rm -rf autom4te.cache

mrproper: clean
	rm -f configure config.h

%.d: %.cpp
	set -e; rm -f "$@"; \
	$(CXX) -M -MG -MM -MF "$@.$$$$" $(CPPFLAGS) "$<"; \
	sed 's,\($*\)\.o[ :]*,\1.o $@ : ,g' < "$@.$$$$" > "$@"; \
	rm -f "$@.$$$$"
DEPS := $(shell find . -name '*.o' )
include $(DEPS:.o=.d)

velbusd: velbusd.o SockAddr.o Socket.o
	$(CXX) $(CXXFLAGS) -o $@ $+
