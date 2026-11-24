# Stage 1 independent mathematical check

Validated the 12 cube-edge intersections with x+y+z=9+sqrt(3)d using an independent numerical polygon-area calculation (not the PDF generator).

- d=0: six intersections; side lengths 3sqrt(2); area 46.765371804 =27sqrt(3).
- d=0.25: area 46.440612278.
- d=0.8: area 43.439834254.
- d=1.5: area 35.074028853.
- d=sqrt(3)-1e-7: area 31.176916336.
- All agree with 27sqrt(3)-3sqrt(3)d^2 to within 1e-9 square cm.

Analytic derivation: s=9+sqrt(3)d. In 9<=s<12 the equilateral triangle in the positive octant, x+y+z=s, has area sqrt(3)s^2/2. The three portions beyond x=6, y=6, z=6 are disjoint equilateral triangles with total area 3sqrt(3)(s-6)^2/2. Subtraction yields the formula. d is perpendicular distance from the center, and only d=0 yields a regular hexagon.

These answers are reserved for later ink; the current PDF example must not print them.