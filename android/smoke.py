"""Exercise native preparation persistence on a disposable CI emulator."""
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = 'np.com.nathonline.preview'

def adb(*args):
    return subprocess.check_output(['adb', *args], text=True)

def nodes():
    adb('shell', 'uiautomator', 'dump', '/sdcard/nath-ui.xml')
    return list(ET.fromstring(adb('shell', 'cat', '/sdcard/nath-ui.xml')).iter('node'))

def tap(node):
    left, top, right, bottom = map(int, re.findall(r'\d+', node.attrib['bounds']))
    adb('shell', 'input', 'tap', str((left + right) // 2), str((top + bottom) // 2))

def find(prefix):
    for attempt in range(10):
        current = nodes()
        # A slow CI launcher can show its own ANR. Never suppress a Nath ANR.
        launcher_error = any('Quickstep isn' in n.attrib.get('text', '') for n in current)
        if launcher_error:
            close = next((n for n in current if n.attrib.get('text') == 'Close app'), None)
            if close is not None:
                tap(close)
                time.sleep(2)
                continue
        assert not any('NATH isn' in n.attrib.get('text', '') for n in current), 'Nath app ANR'
        for node in current:
            if node.attrib.get('text', '').startswith(prefix):
                return node
        if attempt % 2 == 1:
            width, height = map(int, re.findall(r'(\d+)x(\d+)', adb('shell', 'wm', 'size'))[0])
            adb('shell', 'input', 'swipe', str(width // 2), str(height * 3 // 4), str(width // 2), str(height // 3), '300')
        time.sleep(2)
    raise AssertionError('Missing UI: ' + prefix)

def launch():
    adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.DashboardActivity')
    find('Forms, bills & bookings.')

def screenshot(name):
    Path('apk-output', name).write_bytes(subprocess.check_output(['adb', 'exec-out', 'screencap', '-p']))

launch()
tap(find('Business PAN'))
check = find('Describe the help I need')
assert check.attrib['checked'] == 'false'
tap(check)
assert find('Describe the help I need').attrib['checked'] == 'true'
screenshot('android-preparation.png')
adb('shell', 'am', 'force-stop', PACKAGE)
launch()
tap(find('Business PAN'))
assert find('Describe the help I need').attrib['checked'] == 'true', 'Checklist did not persist'
tap(find('Back to services'))
tap(find('नेपाली'))
find('फाराम, बिल र बुकिङ।')
tap(find('English'))
find('Forms, bills & bookings.')
screenshot('android-dashboard.png')
print('PASS: dashboard, preparation persistence after restart, and language switching')


