Observations:           591                  
    Variables:            26                  20 Jul 2018 12:25
-----------------------------------------------------------------------------------------------------
Variable      Storage   Display    Value
    name         type    format    label      Variable label
-----------------------------------------------------------------------------------------------------
fis_id          		str13   %13s         Unique Facility ID
cyc             		float   %9.0g        Mentoring week for the facility
round          		double  %8.0g        Rounds 1-4
totbirth       		float   %9.0g        Total birth for the mentoring cycle
pph             		float   %9.0g        Postpartum hemorrhage cases for the mentoring cycle
nr              		float   %9.0g        Neonatal resuscitation cases for the mentoring cycle
days_cycle     		byte    %10.0g       (max) days_cycle
pph_prop        		float   %9.0g        Proportion of PPH
nr_prop         		float   %9.0g        Proportion of NR
doc_present     		float   %9.0g        Doctor in the facility for the cycle
mpropatt        		double  %10.0g       Attendance of mentee-sessions
rescale_intra   		float   %9.0g        Rescaled intrapartum score
rescale_newborn 		float   %9.0g        Rescaled newborn score
maternalsimc    		float   %9.0g        Total maternal sims performed by the facility
neonatalsimc    		float   %9.0g        Total neonatal sims performed by the facility
matsim3defc     		byte    %8.0g        3 quantiles of maternalsimc
neonatsim3defc  		byte    %8.0g        3 quantiles of neonatalsimc
total_tc        		float   %9.0g        Total T&C performed by facilities
tc_ter         		byte    %8.0g        3 quantiles of total_tc
fluid           		float   %9.0g        Fluids given to PPH cases
uterot          		float   %9.0g        Uterotonic given to PPH cases
resusc          		float   %9.0g        Resuscitation given to asphyxia cases
rwarmer  