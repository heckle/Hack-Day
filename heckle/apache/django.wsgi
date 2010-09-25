import os
import sys
sys.path.append('/home/jal54/src/hackday/heckle/')
sys.path.append('/home/jal54/src/hackday/')

os.environ['DJANGO_SETTINGS_MODULE'] = 'heckle.settings'

import django.core.handlers.wsgi
application = django.core.handlers.wsgi.WSGIHandler()

import heckle.monitor
heckle.monitor.start(interval=1.0)
