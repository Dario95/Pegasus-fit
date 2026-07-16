# Referencias científicas del motor de plan

Base de evidencia de `app/src/app/core/plan.service.ts` (los números coinciden con los comentarios del código).

## Entrenamiento

1. **Schoenfeld BJ, Ogborn D, Krieger JW (2016).** *Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy: A Systematic Review and Meta-Analysis.* Sports Medicine 46(11):1689-1697. — Entrenar cada grupo muscular **≥2 veces/semana** produce más hipertrofia que 1 vez. Fundamento de usar Full Body y Upper/Lower en frecuencias de 2-4 días en lugar de splits de 1×/músculo.
2. **Schoenfeld BJ, Ogborn D, Krieger JW (2017).** *Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis.* Journal of Sports Sciences 35(11):1073-1082. — **≥10 series semanales por músculo** superan a <10; relación dosis-respuesta. Techos prácticos ~20 series/semana para evitar volumen basura.
3. **Schoenfeld BJ, Pope ZK, Benik FM, et al. (2016).** *Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men.* Journal of Strength and Conditioning Research 30(7):1805-1812. — **3 min de descanso > 1 min** en ejercicios multiarticulares. Fundamento de 150-180 s en compuestos y 90 s en aislados.
4. **Grgic J, Schoenfeld BJ, Orazem J, Sabol F (2022).** *Effects of resistance training performed to repetition failure or non-failure on muscular strength and hypertrophy: A systematic review and meta-analysis.* Journal of Sport and Health Science 11(2):202-211. — Entrenar **cerca del fallo (RIR 0-3)** rinde igual que al fallo absoluto con menor costo de recuperación. Fundamento del RIR objetivo por experiencia.
5. **Schoenfeld BJ, Grgic J, Van Every DW, Plotkin DL (2021).** *Loading Recommendations for Muscle Strength, Hypertrophy, and Local Endurance: A Re-Examination of the Repetition Continuum.* Sports Medicine 51(6):1109-1125. — La hipertrofia es alcanzable en un rango amplio de cargas si el esfuerzo es alto; 6-12 reps es lo práctico; la resistencia local se beneficia de 12-15+.

## Nutrición

6. **Mifflin MD, St Jeor ST, et al. (1990).** *A new predictive equation for resting energy expenditure in healthy individuals.* American Journal of Clinical Nutrition 51(2):241-247. · **Frankenfield D, Roth-Yousey L, Compher C (2005).** *Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults: a systematic review.* JADA 105(5):775-789. — **Mifflin-St Jeor** es la ecuación más precisa para BMR en adultos.
7. **Morton RW, Murphy KT, McKellar SR, et al. (2018).** *A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength.* British Journal of Sports Medicine 52(6):376-384. — Beneficio de proteína hasta **~1.6 g/kg/d** (límite superior del IC ~2.2) en superávit/mantenimiento.
8. **Helms ER, Zinn C, Rowlands DS, Brown SR (2014).** *A systematic review of dietary protein during caloric restriction in resistance trained lean athletes: a case for higher intakes.* JISSN 24(2):127-138. — En **déficit**, 2.3-3.1 g/kg de masa magra protege el músculo → 2.3 g/kg en pérdida de grasa.
9. **Garthe I, Raastad T, Refsnes PE, et al. (2011).** *Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes.* IJSNEM 21(2):97-104. — Pérdida **lenta (~0.7 %/semana)** conserva más masa magra → déficit moderado (~20 %).
10. **Iraki J, Fitschen P, Espinar S, Helms E (2019).** *Nutrition Recommendations for Bodybuilders in the Off-Season: A Narrative Review.* Sports (Basel) 7(7):154. — Superávit pequeño (**~10 %** / 250-500 kcal); grasa dietaria 0.5-1.5 g/kg y **nunca <20 %** de las kcal.
11. **Schoenfeld BJ, Aragon AA (2018).** *How much protein can the body use in a single meal for muscle-building? Implications for daily protein distribution.* JISSN 15:10. — Repartir la proteína en **≥4 comidas de ~0.4 g/kg** maximiza la síntesis proteica diaria.

## Trayectoria de peso (modelo del gráfico de proyección)

13. **Hall KD, Sacks G, Chandramohan D, et al. (2011).** *Quantification of the effect of energy imbalance on bodyweight.* The Lancet 378(9793):826-837. — La pérdida de peso **no es lineal**: el gasto energético cae junto con el peso y la trayectoria se aplana (base del Body Weight Planner del NIH). Fundamento de simular semana a semana recalculando el TDEE al peso actual, en vez de proyectar una recta.
14. **Rosenbaum M, Leibel RL (2010).** *Adaptive thermogenesis in humans.* International Journal of Obesity 34:S47-S55. — Tras perder ~10 % del peso, el gasto cae ~10-15 % **más** de lo que predice la masa perdida (termogénesis adaptativa). En la simulación: reducción de hasta 15 % del gasto proporcional al % de peso perdido.
15. **Kreitzman SN, Coxon AY, Szaz KF (1992).** *Glycogen storage: illusions of easy weight loss, excessive weight regain, and distortions in estimates of body composition.* American Journal of Clinical Nutrition 56(1):292S-293S. — El glucógeno se almacena con 3-4 g de agua por gramo: la caída rápida de la primera semana de dieta es mayormente agua. En la simulación: caída extra única (~1.2 % del peso) en la semana 1, comunicada como tal al usuario.

## Cribado de salud

12. **Warburton DER, Jamnik VK, Bredin SSD, Gledhill N (2021).** *The 2021 Physical Activity Readiness Questionnaire for Everyone (PAR-Q+).* Health & Fitness Journal of Canada. — Cuestionario validado de cribado pre-ejercicio; base del filtro de seguridad de la anamnesis.

---

*Limitación honesta: el motor aplica estas referencias como reglas generales para adultos sanos. No modela condiciones médicas, fármacos, embarazo ni poblaciones especiales — esos casos se derivan a profesionales (regla de oro de la anamnesis).*
