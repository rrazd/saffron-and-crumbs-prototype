import { writeFile } from 'node:fs/promises';

// Deliberately drawn cubic curves replace the noisy raster-traced contours.
// Shared tangent directions keep the broad letter edges continuously smooth.
const svg = `<svg role="img" aria-label="Saffron and Crumbs SC monogram with whisk" xmlns="http://www.w3.org/2000/svg" width="1640" height="1520" viewBox="0 0 1640 1520">
  <title>Saffron &amp; Crumbs monogram</title>
  <g fill="#57301d">
    <!-- S: broad calligraphic ribbon and fine upper serif. -->
    <path d="M544 95 C632 95 722 105 786 108 C790 108 792 112 792 119 L794 278 C794 289 788 290 785 278 C753 160 659 104 544 103 C424 102 328 177 328 278 C328 412 500 509 653 609 C773 687 831 754 831 866 C831 1008 719 1092 580 1142 C571 1146 566 1128 575 1124 C671 1086 731 1001 731 914 C731 796 638 721 484 639 C326 555 231 477 231 351 C231 214 369 101 498 98 C513 96 529 95 544 95 Z"/>
    <path d="M129 824 C106 881 159 965 231 1023 C294 1074 366 1108 439 1123 L457 1170 C298 1166 184 1102 133 1004 C107 954 96 872 123 827 C126 822 130 822 129 824 Z"/>
    <!-- C: upper hairline, serif and uninterrupted lower sweep. -->
    <path d="M628 569 C790 449 964 430 1196 510 C1201 512 1203 515 1203 523 L1203 680 C1203 692 1196 692 1193 680 C1155 553 1046 472 924 473 C835 473 746 516 669 596 C665 600 662 600 657 597 L630 581 C624 577 623 573 628 569 Z"/>
    <path stroke="#57301d" stroke-width="3" stroke-linejoin="round" d="M523 682 L570 709 C576 712 577 716 573 724 C539 791 521 874 521 966 C521 1104 574 1227 678 1324 C763 1403 851 1441 954 1441 C1084 1441 1211 1380 1295 1290 C1309 1275 1327 1261 1343 1256 C1246 1376 1098 1451 950 1451 C794 1451 638 1414 554 1331 C465 1243 414 1125 414 982 C414 873 451 762 513 685 C516 681 519 680 523 682 Z"/>
    <!-- The flourish joins the S and runs behind the whisk. -->
    <path d="M680 1095 C716 1077 739 1053 758 1031 C788 1048 797 1042 823 1043 L817 1063 C782 1072 752 1090 727 1112 C711 1125 710 1130 711 1137 C710 1117 698 1101 680 1095 Z"/>
    <path stroke="#57301d" stroke-width="3" stroke-linejoin="round" d="M1007 1064 C941 1038 871 1043 817 1063 C763 1083 731 1106 733 1137 C737 1200 869 1255 1032 1280 C1176 1302 1321 1291 1400 1231 C1477 1173 1473 1088 1378 1023 C1373 1019 1377 1017 1384 1020 C1495 1062 1507 1161 1419 1235 C1327 1312 1165 1313 1028 1291 C854 1263 710 1209 711 1137 C712 1092 746 1062 809 1046 C879 1028 951 1030 1007 1064 Z"/>
    <path stroke="#57301d" stroke-width="3" stroke-linejoin="round" d="M910 1211 C949 1271 1028 1239 1112 1194 C1196 1149 1272 1135 1321 1168 C1399 1221 1352 1254 1324 1270 C1332 1240 1347 1205 1311 1182 C1258 1146 1175 1175 1118 1205 C1032 1250 951 1284 910 1211 Z"/>
    <!-- Solid collar closes hairline slivers where the wire loops meet. -->
    <circle cx="1275" cy="724" r="8"/>
    <!-- Whisk handle with a smooth oval hanging hole. -->
    <path fill-rule="evenodd" d="M1259.4 703.2 C1314 662 1372 470 1427 370 C1456 320 1495 277 1524 280 C1565 285 1542 348 1516 391 C1464 478 1388 558 1336 638 C1312 675 1298 654 1290 735.6 L1259.4 703.2 Z M1470 382 C1481 392 1504 365 1513 343 C1522 321 1516 308 1505 315 C1489 325 1454 368 1470 382 Z"/>
  </g>
  <!-- Wire loops share exact endpoints; no traced bumps or loose fragments. -->
  <g fill="none" stroke="#57301d" stroke-linecap="round" stroke-linejoin="round">
    <path stroke-width="14" d="M1263 708 C1171 777 1040 875 967 984 C923 1051 906 1112 922 1168 C935 1214 959 1230 1000 1213 C1161 1146 1260 979 1284 735"/>
    <path stroke-width="12.5" d="M1269 714 C1187 819 1035 940 973 1053 C943 1109 929 1175 957 1211 C986 1234 1060 1153 1129 1046 C1205 927 1248 811 1278 727"/>
    <path stroke-width="10.5" d="M1274 721 C1159 878 1046 1046 959 1213"/>
  </g>
</svg>
`;

for (const name of ['logo-mark.svg', 'logo-mark-whisk.svg']) {
  await writeFile(new URL('../dist/assets/' + name, import.meta.url), svg);
}

// Use the current mark, tightly framed and optically strengthened for tab sizes.
const faviconMark = svg.slice(svg.indexOf('  <g'), svg.lastIndexOf('</svg>'))
  .replaceAll('#57301d', '#fbf5ec')
  .replace('<g fill="#fbf5ec">', '<g fill="#fbf5ec" stroke="#fbf5ec" stroke-width="18" stroke-linejoin="round">')
  .replaceAll('stroke-width="3"', 'stroke-width="18"')
  .replace('stroke-width="14"', 'stroke-width="30"')
  .replace('stroke-width="12.5"', 'stroke-width="28"')
  .replace('stroke-width="10.5"', 'stroke-width="26"');
await writeFile(new URL('../dist/assets/favicon.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="11" fill="#57301d"/><svg x="2" y="2" width="60" height="60" viewBox="90 75 1470 1390">${faviconMark}</svg></svg>\n`);
